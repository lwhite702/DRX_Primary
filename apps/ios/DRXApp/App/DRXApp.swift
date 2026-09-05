import SwiftUI
import ClerkKit
import UIKit
import UserNotifications

extension Notification.Name {
    static let deliveryPushRouteRequested = Notification.Name("DRXDeliveryPushRouteRequested")
}

@MainActor
final class PushNotificationCoordinator {
    static let shared = PushNotificationCoordinator()

    private let deviceIDKey = "drx.ios.push-device-id.v1"
    private var deviceToken: String?

    private var deviceID: String {
        if let existing = UserDefaults.standard.string(forKey: deviceIDKey), !existing.isEmpty {
            return existing
        }
        let created = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        UserDefaults.standard.set(created, forKey: deviceIDKey)
        return created
    }

    func requestAuthorizationAndRegister() async {
        guard !ProcessInfo.processInfo.arguments.contains("--ui-testing") else { return }
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        var authorized = settings.authorizationStatus == .authorized ||
            settings.authorizationStatus == .provisional ||
            settings.authorizationStatus == .ephemeral
        if settings.authorizationStatus == .notDetermined {
            authorized = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true
        }
        guard authorized else { return }
        UIApplication.shared.registerForRemoteNotifications()
        await registerCurrentToken()
    }

    func receivedDeviceToken(_ data: Data) async {
        deviceToken = data.map { String(format: "%02x", $0) }.joined()
        await registerCurrentToken()
    }

    func handleDeliveryPush(
        cancellation: DRXDeliveryPushCancellationPayload?,
        push: DRXDeliveryPushPayload?,
        local: DRXLocalDeliveryReminderPayload?,
        route: Bool
    ) async {
        if let cancellation {
            DeliveryReminderScheduler.cancel(deliveryID: cancellation.deliveryId)
            await acknowledge(outboxID: cancellation.outboxId)
            return
        }
        if let push {
            await acknowledge(outboxID: push.outboxId)
            if route {
                NotificationCenter.default.post(name: .deliveryPushRouteRequested, object: push.deliveryId)
            }
            return
        }
        if route, let local {
            NotificationCenter.default.post(name: .deliveryPushRouteRequested, object: local.deliveryId)
        }
    }

    func unregister() async {
        let _: DRXUnregisterPushTokenResponse? = try? await ConvexClient.shared.mutation(
            "push:unregisterDeviceToken",
            args: DRXUnregisterPushTokenArgs(deviceId: deviceID, provider: "apns")
        )
    }

    private func registerCurrentToken() async {
        guard let deviceToken, !deviceToken.isEmpty else { return }
        let _: DRXRegisterPushTokenResponse? = try? await ConvexClient.shared.mutation(
            "push:registerDeviceToken",
            args: DRXRegisterPushTokenArgs(
                deviceId: deviceID,
                platform: "ios",
                provider: "apns",
                token: deviceToken
            )
        )
    }

    private func acknowledge(outboxID: String) async {
        let _: DRXAcknowledgeDeliveryPushResponse? = try? await ConvexClient.shared.mutation(
            "push:acknowledgeDeliveryPush",
            args: DRXAcknowledgeDeliveryPushArgs(outboxId: outboxID)
        )
    }
}

final class DRXNotificationDelegate: NSObject, UNUserNotificationCenterDelegate, Sendable {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let cancellation = DRXDeliveryPushCancellationPayload.parse(userInfo)
        let push = DRXDeliveryPushPayload.parse(userInfo)
        let local = DRXLocalDeliveryReminderPayload.parse(userInfo)
        Task { @MainActor in
            await PushNotificationCoordinator.shared.handleDeliveryPush(
                cancellation: cancellation,
                push: push,
                local: local,
                route: false
            )
        }
        completionHandler(
            cancellation == nil
                ? [.banner, .list, .sound]
                : []
        )
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let cancellation = DRXDeliveryPushCancellationPayload.parse(userInfo)
        let push = DRXDeliveryPushPayload.parse(userInfo)
        let local = DRXLocalDeliveryReminderPayload.parse(userInfo)
        Task { @MainActor in
            await PushNotificationCoordinator.shared.handleDeliveryPush(
                cancellation: cancellation,
                push: push,
                local: local,
                route: true
            )
        }
        completionHandler()
    }
}

@MainActor
final class DRXAppDelegate: NSObject, UIApplicationDelegate {
    private let notificationDelegate = DRXNotificationDelegate()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = notificationDelegate
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            await PushNotificationCoordinator.shared.receivedDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        let cancellation = DRXDeliveryPushCancellationPayload.parse(userInfo)
        let push = DRXDeliveryPushPayload.parse(userInfo)
        let local = DRXLocalDeliveryReminderPayload.parse(userInfo)
        Task { @MainActor in
            await PushNotificationCoordinator.shared.handleDeliveryPush(
                cancellation: cancellation,
                push: push,
                local: local,
                route: false
            )
        }
        completionHandler(.newData)
    }
}

@main
struct DRXApp: App {
    @UIApplicationDelegateAdaptor(DRXAppDelegate.self) private var appDelegate
    private let configuration: AppConfiguration?
    private let configurationError: String?
    @State private var environment: AppEnvironment?

    init() {
        do {
            let configuration = try AppConfiguration.live()
            Clerk.configure(publishableKey: configuration.clerkPublishableKey)
            self.configuration = configuration
            self.configurationError = nil
            _environment = State(initialValue: AppEnvironment.live(configuration: configuration))
        } catch {
            self.configuration = nil
            self.configurationError = error.localizedDescription
            _environment = State(initialValue: nil)
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if configuration != nil, let environment {
                    AppRootView(environment: environment)
                        .environment(Clerk.shared)
                        .onOpenURL { url in
                            Task { try? await Clerk.shared.handle(url) }
                        }
                } else {
                    ConfigurationErrorView(
                        message: configurationError ?? "DRX could not load its app configuration."
                    )
                }
            }
            .preferredColorScheme(.dark)
        }
    }
}

private struct ConfigurationErrorView: View {
    let message: String

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            ContentUnavailableView {
                Label("Configuration Required", systemImage: "wrench.and.screwdriver.fill")
                    .foregroundStyle(DRXPalette.danger)
            } description: {
                Text(message)
                    .foregroundStyle(DRXPalette.muted)
            }
        }
        .padding()
        .accessibilityIdentifier("configurationErrorView")
    }
}
