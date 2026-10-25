import SwiftUI
import ClerkKit
import ClerkKitUI
import UserNotifications

struct AppRootView: View {
    @State private var environment: AppEnvironment
    @State private var navigationCoordinator = NavigationCoordinator()
    @State private var identifiedUserID: String?
    @State private var authenticationRoute: AuthenticationRoute?
    @State private var minimumSplashDurationElapsed = false
    @State private var hasCompletedInitialSplash = false
    @Environment(Clerk.self) private var clerk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(environment: AppEnvironment) {
        _environment = State(initialValue: environment)
    }

    var body: some View {
        Group {
            if !hasCompletedInitialSplash {
                LaunchSplashView()
            } else {
                switch environment.rootState {
                case .initializing, .checkingProvisioning, .loadingWorkspace:
                    SessionBootstrapView()
                case .signedOut:
                    SignedOutWelcomeView(
                        onCreateAccount: { authenticationRoute = .signUp },
                        onSignIn: { authenticationRoute = .signIn }
                    )
                    .onAppear { environment.telemetry.screen("Welcome") }
                case .needsOnboarding:
                    if clerk.user != nil || ProcessInfo.processInfo.arguments.contains("--ui-testing-onboarding") {
                        NativeOnboardingView()
                    } else {
                        SignedOutWelcomeView(
                            onCreateAccount: { authenticationRoute = .signUp },
                            onSignIn: { authenticationRoute = .signIn }
                        )
                    }
                case .ready:
                    if clerk.user != nil || ProcessInfo.processInfo.arguments.contains("--ui-testing-operator") {
                        OperatorTabView()
                    } else {
                        SignedOutWelcomeView(
                            onCreateAccount: { authenticationRoute = .signUp },
                            onSignIn: { authenticationRoute = .signIn }
                        )
                    }
                case .recoverableError:
                    ProvisioningRecoveryView()
                }
            }
        }
        .id(hasCompletedInitialSplash ? String(describing: environment.rootState) : "launchSplash")
        .transition(.asymmetric(
            insertion: DRXMotion.enter(reduceMotion: reduceMotion),
            removal: DRXMotion.exit(reduceMotion: reduceMotion)
        ))
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: environment.rootState)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: hasCompletedInitialSplash)
        .tint(DRXPalette.accent)
        .environment(environment)
        .environment(navigationCoordinator)
        .fullScreenCover(item: $authenticationRoute) { route in
            AuthView(mode: route.mode, isDismissible: true)
                .environment(\.clerkTheme, .drx)
                .background(DRXPalette.canvas.ignoresSafeArea())
                .accessibilityIdentifier(route.accessibilityIdentifier)
        }
        .task {
            guard !ProcessInfo.processInfo.arguments.contains("--ui-testing-hold-splash") else { return }
            try? await Task.sleep(for: .milliseconds(900))
            minimumSplashDurationElapsed = true
            completeInitialSplashIfReady()
        }
        .task(id: clerk.user?.id) {
            guard !ProcessInfo.processInfo.arguments.contains("--ui-testing-operator") &&
                  !ProcessInfo.processInfo.arguments.contains("--ui-testing-onboarding") else {
                return
            }
            guard let userID = clerk.user?.id else {
                await environment.clerkSignedOut()
                identifiedUserID = nil
                return
            }
            if let identifiedUserID, identifiedUserID != userID {
                await environment.signOut()
            }
            identifiedUserID = userID
            await environment.checkProvisioning()
        }
        .onChange(of: environment.rootState) { _, _ in
            completeInitialSplashIfReady()
        }
        .onChange(of: clerk.user?.id) { _, userID in
            if userID != nil {
                authenticationRoute = nil
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .deliveryPushRouteRequested)) { notification in
            let deliveryId = notification.object as? String
            navigationCoordinator.openDelivery(deliveryId: deliveryId)
            environment.requestDeliveryQueue()
        }
        .task(id: "\(clerk.user?.id ?? "signed-out"):\(String(describing: environment.rootState))") {
            guard clerk.user != nil, environment.rootState == .ready else { return }
            await PushNotificationCoordinator.shared.requestAuthorizationAndRegister()
        }
    }

    private func completeInitialSplashIfReady() {
        guard minimumSplashDurationElapsed,
              environment.rootState != .initializing,
              environment.rootState != .checkingProvisioning,
              environment.rootState != .loadingWorkspace else { return }
        hasCompletedInitialSplash = true
    }
}

private enum AuthenticationRoute: String, Identifiable {
    case signIn
    case signUp

    var id: String { rawValue }

    var mode: AuthView.Mode {
        switch self {
        case .signIn: .signIn
        case .signUp: .signUp
        }
    }

    var accessibilityIdentifier: String {
        switch self {
        case .signIn: "signInAuthView"
        case .signUp: "signUpAuthView"
        }
    }
}

private struct LaunchSplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isGlowing = false

    private var isHeldForUITesting: Bool {
        ProcessInfo.processInfo.arguments.contains("--ui-testing-hold-splash")
    }

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()
            RadialGradient(
                colors: [DRXPalette.accent.opacity(isGlowing ? 0.17 : 0.07), .clear],
                center: .center,
                startRadius: 12,
                endRadius: 240
            )
            .ignoresSafeArea()
            .accessibilityHidden(true)

            Image("DRXWordmark")
                .resizable()
                .scaledToFit()
                .frame(width: 210, height: 132)
                .scaleEffect(reduceMotion || isHeldForUITesting ? 1 : (isGlowing ? 1.025 : 0.985))
                .opacity(reduceMotion || isHeldForUITesting ? 1 : (isGlowing ? 1 : 0.86))
                .shadow(color: DRXPalette.accent.opacity(isGlowing ? 0.78 : 0.28), radius: isGlowing ? 34 : 14)
                .accessibilityLabel("Deelrx CRM")
        }
        .accessibilityIdentifier("launchSplashView")
        .onAppear {
            guard !reduceMotion, !isHeldForUITesting else {
                isGlowing = true
                return
            }
            withAnimation(.easeInOut(duration: 1.15).repeatForever(autoreverses: true)) {
                isGlowing = true
            }
        }
    }
}

private struct SignedOutWelcomeView: View {
    let onCreateAccount: () -> Void
    let onSignIn: () -> Void

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()
            VStack(spacing: DRXSpacing.xxl) {
                Spacer()
                Image("DRXWordmark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 190, height: 100)
                    .accessibilityLabel(DRXContent.Brand.formalName)
                VStack(spacing: DRXSpacing.sm) {
                    Text("Keep the business straight")
                        .font(.largeTitle.bold())
                        .foregroundStyle(DRXPalette.ink)
                        .multilineTextAlignment(.center)
                    Text("Create an account or sign in to track customers, stock, sales, and money.")
                        .foregroundStyle(DRXPalette.muted)
                        .multilineTextAlignment(.center)
                }
                VStack(spacing: DRXSpacing.md) {
                    Button("Create account", action: onCreateAccount)
                        .buttonStyle(.drxPrimaryFullWidth)
                        .accessibilityIdentifier("createAccountButton")
                    Button("Sign in", action: onSignIn)
                        .buttonStyle(.bordered)
                        .tint(DRXPalette.ink)
                        .accessibilityIdentifier("signInButton")
                }
                .frame(maxWidth: 360)
                Spacer()
            }
            .padding(DRXSpacing.xxl)
        }
    }
}

private struct SessionBootstrapView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            VStack(spacing: 24) {
                Image("DRXWordmark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 184, height: 96)
                    .accessibilityLabel(DRXContent.Brand.formalName)

                VStack(spacing: 8) {
                    Text("Opening \(DRXContent.Brand.formalName)")
                        .font(.title2.bold())
                        .foregroundStyle(DRXPalette.ink)

                    Text("Checking your account")
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                }

                ProgressView("Loading your business…")
                    .tint(DRXPalette.accent)
                    .foregroundStyle(DRXPalette.muted)
                    .accessibilityIdentifier("sessionLoadingIndicator")
            }
            .padding(32)
            .frame(maxWidth: 440)
            .background(DRXPalette.card, in: RoundedRectangle(cornerRadius: DRXRadius.panel))
            .overlay {
                RoundedRectangle(cornerRadius: DRXRadius.panel)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.35), radius: 24, y: 12)
            .padding(24)
        }
        .onAppear { environment.telemetry.screen("Session Bootstrap") }
    }
}

private struct ProvisioningRecoveryView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var signOutError: String?

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill").font(.largeTitle).foregroundStyle(DRXPalette.danger)
            Text("Business unavailable").font(.title2.bold())
            Text(environment.provisioningMessage ?? "We couldn’t open your business.")
                .multilineTextAlignment(.center).foregroundStyle(DRXPalette.muted)
                .accessibilityIdentifier("provisioningErrorMessage")
            Button(DRXContent.Actions.tryAgain) { Task { await environment.checkProvisioning() } }
                .buttonStyle(.drxPrimary).accessibilityIdentifier("retryProvisioningButton")
            Button("Sign Out", role: .destructive) {
                Task {
                    await PushNotificationCoordinator.shared.unregister()
                    try? await clerk.auth.signOut()
                    await environment.signOut()
                }
            }
            if let requestID = environment.supportRequestID {
                ShareLink(item: requestID) { Label("Copy Support Details", systemImage: "doc.on.doc") }
                    .accessibilityIdentifier("supportDetailsButton")
            }
        }
        .padding(32)
        .alert("Sign Out Failed", isPresented: .init(
            get: { signOutError != nil },
            set: { if !$0 { signOutError = nil } }
        )) {
            Button("OK", role: .cancel) { signOutError = nil }
        } message: {
            Text(signOutError ?? "")
        }
    }
}

private struct OperatorTabView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(NavigationCoordinator.self) private var navigationCoordinator
    @Environment(Clerk.self) private var clerk
    @State private var signOutError: String?
    @State private var presentsDeliveries = false
    @State private var consumedDeliveryRouteRequestID = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        @Bindable var coordinator = navigationCoordinator
        TabView(selection: $coordinator.selectedTab) {
            NavigationStack(path: $coordinator.dashboardPath) {
                DashboardView()
            }
            .tabItem { Label(DRXContent.Navigation.home, systemImage: "gauge.with.dots.needle.67percent") }
            .tag(WorkspaceTab.dashboard)

            NavigationStack(path: $coordinator.posPath) {
                POSView()
            }
            .tabItem { Label(DRXContent.Navigation.newSale, systemImage: "cart.fill") }
            .tag(WorkspaceTab.pos)

            NavigationStack(path: $coordinator.inventoryPath) {
                InventoryView()
            }
            .tabItem { Label(DRXContent.Navigation.products, systemImage: "shippingbox.fill") }
            .tag(WorkspaceTab.inventory)

            NavigationStack(path: $coordinator.customerPath) {
                CustomersView()
            }
            .tabItem { Label(DRXContent.Navigation.customers, systemImage: "person.2.fill") }
            .tag(WorkspaceTab.customers)

            NavigationStack(path: $coordinator.morePath) {
                List {
                    Section("Modules") {
                        NavigationLink(value: MoreRoute.credit) {
                            Label(DRXContent.Navigation.payments, systemImage: "creditcard.fill")
                        }
                        .accessibilityIdentifier("module_credit")

                        NavigationLink(value: MoreRoute.deliveries(deliveryId: nil)) {
                            Label(DRXContent.Navigation.deliveries, systemImage: "car.side.fill")
                        }
                        .accessibilityIdentifier("module_deliveries")

                        NavigationLink(value: MoreRoute.reports) {
                            Label(DRXContent.Navigation.reports, systemImage: "chart.bar.doc.horizontal.fill")
                        }
                        .accessibilityIdentifier("module_reports")

                        NavigationLink(value: MoreRoute.workspaces) {
                            Label(DRXContent.Terms.business, systemImage: "building.2.fill")
                        }
                        .accessibilityIdentifier("module_workspaces")

                        NavigationLink(value: MoreRoute.aiIntelligence) {
                            Label(DRXContent.Navigation.trends, systemImage: "sparkles")
                        }
                        .accessibilityIdentifier("module_ai_intelligence")
                    }

                    Section("Session") {
                        if let session = environment.session.operatorSession {
                            LabeledContent(DRXContent.Terms.teamMember, value: session.displayName)
                            LabeledContent(DRXContent.Terms.business, value: session.businessName)
                        }

                        Button("Sign Out", role: .destructive) {
                            Task {
                                await PushNotificationCoordinator.shared.unregister()
                                try? await clerk.auth.signOut()
                                await environment.signOut()
                            }
                        }
                        .accessibilityIdentifier("signOutButton")
                    }

                    Section("Help & Legal") {
                        NavigationLink(value: MoreRoute.accountAndLegal) {
                            Label("Help, Legal & Account", systemImage: "person.crop.circle.badge.questionmark")
                        }
                        .accessibilityIdentifier("helpLegalAccountButton")
                    }
                }
                .scrollContentBackground(.hidden)
                .background(DRXPalette.canvas)
                .navigationTitle("More")
                .navigationDestination(for: MoreRoute.self) { route in
                    switch route {
                    case .credit:
                        CreditView()
                    case .deliveries:
                        DeliveryQueueView()
                    case .reports:
                        ReportsView()
                    case .workspaces:
                        WorkspacesView()
                    case .aiIntelligence:
                        AIIntelligenceView()
                    case .accountAndLegal:
                        AccountAndLegalView()
                    }
                }
            }
            .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
            .tag(WorkspaceTab.more)
            .onAppear { environment.telemetry.screen("More") }
        }
        .tint(DRXPalette.accent)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: coordinator.selectedTab)
        .toolbarBackground(DRXPalette.surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.dark, for: .tabBar)
        .onAppear {
            if environment.nextWorkspaceTab != coordinator.selectedTab {
                coordinator.selectedTab = environment.nextWorkspaceTab
            }
            presentRequestedDeliveryQueue()
        }
        .onChange(of: environment.nextWorkspaceTab) { _, nextTab in
            coordinator.selectedTab = nextTab
        }
        .onChange(of: environment.deliveryRouteRequestID) { _, _ in
            presentRequestedDeliveryQueue()
        }
        .sheet(isPresented: $presentsDeliveries) {
            NavigationStack { DeliveryQueueView() }
        }
        .alert("Sign Out Failed", isPresented: .init(
            get: { signOutError != nil },
            set: { if !$0 { signOutError = nil } }
        )) {
            Button("OK", role: .cancel) { signOutError = nil }
        } message: {
            Text(signOutError ?? "")
        }
    }

    private func presentRequestedDeliveryQueue() {
        guard environment.deliveryRouteRequestID != consumedDeliveryRouteRequestID else { return }
        consumedDeliveryRouteRequestID = environment.deliveryRouteRequestID
        navigationCoordinator.selectedTab = .more
        presentsDeliveries = true
    }

    private func moduleLink(_ title: String, symbol: String) -> some View {
        NavigationLink {
            AuthenticatedWebView(path: path(for: title), title: title)
        } label: {
            Label(title, systemImage: symbol)
        }
        .accessibilityIdentifier("module_\(title.lowercased().replacingOccurrences(of: " ", with: "_"))")
    }

    private func path(for title: String) -> String {
        switch title {
        case "Dashboard": return "dashboard"
        case "POS": return "pos"
        case "Inventory": return "inventory"
        case "Customers": return "customers"
        case "Credit": return "credit"
        case "Reports": return "reports"
        case "Workspaces": return "workspaces"
        case "AI Intelligence": return "ai-intelligence"
        default: return "dashboard"
        }
    }
}

@MainActor
@Observable
private final class DeliveryQueueStore {
    var deliveries: [DRXDelivery] = []
    var isLoading = false
    var error: String?
    var localWarning: String?
    var serverReminder: DRXDeliveryNotification?
    private var currentOperatorID: String?

    func configure(operatorID: String?) {
        currentOperatorID = operatorID
    }

    var sortedDeliveries: [DRXDelivery] {
        deliveries.sorted { left, right in
            if left.isOpen != right.isOpen { return left.isOpen }
            return (left.dispatchDueAt ?? left.createdAt) < (right.dispatchDueAt ?? right.createdAt)
        }
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let loaded: [DRXDelivery] = try await ConvexClient.shared.query(
                "deliveries:listDeliveries",
                args: EmptyConvexArgs()
            )
            deliveries = loaded
            if let currentOperatorID {
                await DeliveryReminderScheduler.reconcile(
                    deliveries: loaded,
                    currentOperatorID: currentOperatorID
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func pollServerReminders() async {
        guard currentOperatorID != nil, serverReminder == nil else { return }
        do {
            let notifications: [DRXDeliveryNotification] = try await ConvexClient.shared.query(
                "deliveries:listUnreadNotifications",
                args: EmptyConvexArgs()
            )
            serverReminder = DeliveryNotificationQueue.next(notifications: notifications)
        } catch {
            // The queue's absolute-ETA local reminders remain available while
            // this synchronized every-five-minute server source reconnects.
        }
    }

    func acknowledgeServerReminder(_ notification: DRXDeliveryNotification) async {
        do {
            let _: AcknowledgeDeliveryNotificationResponse = try await ConvexClient.shared.mutation(
                "deliveries:acknowledgeNotification",
                args: AcknowledgeDeliveryNotificationArgs(notificationId: notification.id)
            )
            if serverReminder?.id == notification.id {
                serverReminder = nil
            }
        } catch {
            if serverReminder?.id == notification.id {
                serverReminder = nil
            }
            localWarning = "The reminder could not be acknowledged on the server and will reappear after synchronization: \(error.localizedDescription)"
        }
    }

    func markUberOrdered(_ delivery: DRXDelivery, waitMinutes: Int) async {
        error = nil
        localWarning = nil
        do {
            let response: MarkUberOrderedResponse = try await ConvexClient.shared.mutation(
                "deliveries:markUberOrdered",
                args: MarkUberOrderedArgs(deliveryId: delivery.id, waitMinutes: waitMinutes)
            )
            await load()
            if let refreshError = error {
                localWarning = "Uber was ordered, but the delivery queue could not refresh: \(refreshError)"
                error = nil
            }
            do {
                try await DeliveryReminderScheduler.schedule(
                    deliveryID: delivery.id,
                    estimatedArrivalAt: response.estimatedArrivalAt
                )
            } catch {
                let reminderWarning = "Uber was ordered, but this device could not schedule its local courier reminder: \(error.localizedDescription)"
                localWarning = [localWarning, reminderWarning]
                    .compactMap { $0 }
                    .joined(separator: " ")
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markHandedOff(_ delivery: DRXDelivery) async {
        if await mutate("deliveries:markHandedOff", args: DeliveryIdArgs(deliveryId: delivery.id)) {
            DeliveryReminderScheduler.cancel(deliveryID: delivery.id)
        }
    }

    func markDelivered(_ delivery: DRXDelivery) async {
        if await mutate("deliveries:markDelivered", args: DeliveryIdArgs(deliveryId: delivery.id)) {
            DeliveryReminderScheduler.cancel(deliveryID: delivery.id)
        }
    }

    func cancel(_ delivery: DRXDelivery, reason: String) async {
        if await mutate(
            "deliveries:cancelDelivery",
            args: CancelDeliveryArgs(deliveryId: delivery.id, reason: reason)
        ) {
            DeliveryReminderScheduler.cancel(deliveryID: delivery.id)
        }
    }

    func assignToMe(_ delivery: DRXDelivery) async {
        await mutate("deliveries:assignDelivery", args: AssignDeliveryArgs(deliveryId: delivery.id, assigneeUserId: currentOperatorID))
    }

    func assign(_ delivery: DRXDelivery, to assigneeUserId: String) async {
        await mutate("deliveries:assignDelivery", args: AssignDeliveryArgs(deliveryId: delivery.id, assigneeUserId: assigneeUserId))
    }

    func fetchDetails(for delivery: DRXDelivery) async throws -> DRXDeliveryDetailResponse {
        try await ConvexClient.shared.query(
            "deliveries:getDelivery",
            args: DeliveryIdArgs(deliveryId: delivery.id)
        )
    }

    func address(for delivery: DRXDelivery) async throws -> String {
        let response: DeliveryAddressResponse = try await ConvexClient.shared.mutation(
            "deliveries:getDeliveryAddress",
            args: DeliveryIdArgs(deliveryId: delivery.id)
        )
        return response.address
    }

    @discardableResult
    private func mutate<Args: Encodable & Sendable>(_ name: String, args: Args) async -> Bool {
        error = nil
        do {
            let _: IgnoredDeliveryMutationResponse = try await ConvexClient.shared.mutation(name, args: args)
            await load()
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }
}

enum DeliveryReminderTiming {
    static func triggerIntervals(
        estimatedArrivalAtMilliseconds: Double,
        nowMilliseconds: Double
    ) throws -> (warning: TimeInterval?, eta: TimeInterval?) {
        guard estimatedArrivalAtMilliseconds.isFinite,
              estimatedArrivalAtMilliseconds > 0,
              nowMilliseconds.isFinite,
              nowMilliseconds >= 0 else {
            throw DeliveryReminderSchedulingError.invalidEstimatedArrival
        }
        let warning = (estimatedArrivalAtMilliseconds - 120_000 - nowMilliseconds) / 1_000
        let eta = (estimatedArrivalAtMilliseconds - nowMilliseconds) / 1_000
        return (warning: warning > 0 ? warning : nil, eta: eta > 0 ? eta : nil)
    }
}

enum DeliveryNotificationQueue {
    static func next(notifications: [DRXDeliveryNotification]) -> DRXDeliveryNotification? {
        notifications
            .filter { $0.acknowledgedAt == nil }
            .sorted { $0.createdAt < $1.createdAt }
            .first
    }
}

enum DeliveryReminderScheduler {
    private static func identifiers(for deliveryID: String) -> [String] {
        ["delivery.\(deliveryID).warning", "delivery.\(deliveryID).eta"]
    }

    static func schedule(
        deliveryID: String,
        estimatedArrivalAt: Double
    ) async throws {
        let center = UNUserNotificationCenter.current()
        guard (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true else {
            throw DeliveryReminderSchedulingError.notificationsUnavailable
        }
        cancel(deliveryID: deliveryID)
        let intervals = try DeliveryReminderTiming.triggerIntervals(
            estimatedArrivalAtMilliseconds: estimatedArrivalAt,
            nowMilliseconds: Date.now.timeIntervalSince1970 * 1_000
        )

        let warning = UNMutableNotificationContent()
        warning.title = "Courier arrives in two minutes"
        warning.body = "A delivery needs your attention."
        warning.sound = .default
        warning.userInfo = [
            "type": "local_delivery_reminder",
            "deliveryId": deliveryID,
            "kind": "eta_warning",
            "scheduledFor": estimatedArrivalAt - 120_000,
            "route": "deliveries",
        ]

        let eta = UNMutableNotificationContent()
        eta.title = "Courier wait time ended"
        eta.body = "A delivery needs your attention."
        eta.sound = .default
        eta.userInfo = [
            "type": "local_delivery_reminder",
            "deliveryId": deliveryID,
            "kind": "eta_due",
            "scheduledFor": estimatedArrivalAt,
            "route": "deliveries",
        ]

        do {
            if let warningInterval = intervals.warning {
                try await center.add(UNNotificationRequest(
                    identifier: identifiers(for: deliveryID)[0],
                    content: warning,
                    trigger: UNTimeIntervalNotificationTrigger(timeInterval: warningInterval, repeats: false)
                ))
            }
            if let etaInterval = intervals.eta {
                try await center.add(UNNotificationRequest(
                    identifier: identifiers(for: deliveryID)[1],
                    content: eta,
                    trigger: UNTimeIntervalNotificationTrigger(timeInterval: etaInterval, repeats: false)
                ))
            }
        } catch {
            cancel(deliveryID: deliveryID)
            throw error
        }
    }

    static func cancel(deliveryID: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: identifiers(for: deliveryID)
        )
    }

    static func reconcile(
        deliveries: [DRXDelivery],
        currentOperatorID: String
    ) async {
        for delivery in deliveries {
            guard delivery.status == .uberOrdered,
                  delivery.assignedToUserId == currentOperatorID,
                  let estimatedArrivalAt = delivery.estimatedArrivalAt else {
                // A live reassignment is authoritative and cancels the old
                // operator's device reminders during shift handoff.
                cancel(deliveryID: delivery.id)
                continue
            }
            try? await schedule(
                deliveryID: delivery.id,
                estimatedArrivalAt: estimatedArrivalAt
            )
        }
    }
}

private enum DeliveryReminderSchedulingError: LocalizedError {
    case invalidEstimatedArrival
    case notificationsUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidEstimatedArrival:
            "The server returned an invalid courier ETA."
        case .notificationsUnavailable:
            "Notifications are disabled or unavailable."
        }
    }
}

private struct IgnoredDeliveryMutationResponse: Decodable {}

private struct DeliveryQueueView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var store = DeliveryQueueStore()
    @State private var deliveryForUber: DRXDelivery?
    @State private var deliveryForCancellation: DRXDelivery?
    @State private var deliveryForDetails: DRXDelivery?

    private var operatorID: String? { environment.session.operatorSession?.operatorID }
    private var isManager: Bool {
        environment.session.operatorSession?.roles.contains(where: {
            ["owner", "admin", "manager"].contains($0.lowercased())
        }) == true
    }

    var body: some View {
        Group {
            if store.isLoading && store.deliveries.isEmpty {
                ProgressView("Loading deliveries…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
            } else if let error = store.error, store.deliveries.isEmpty {
                ContentUnavailableView(
                    "Deliveries unavailable",
                    systemImage: "exclamationmark.triangle.fill",
                    description: Text(error)
                )
            } else if store.deliveries.isEmpty {
                ContentUnavailableView(
                    "No deliveries",
                    systemImage: "car.side",
                    description: Text("Completed delivery checkouts appear here for dispatch.")
                )
            } else {
                List(store.sortedDeliveries) { delivery in
                    DeliveryQueueRow(
                        delivery: delivery,
                        onAssign: { Task { await store.assignToMe(delivery) } },
                        onOrderUber: { deliveryForUber = delivery },
                        onHandOff: { Task { await store.markHandedOff(delivery) } },
                        onDeliver: { Task { await store.markDelivered(delivery) } },
                        onCancel: { deliveryForCancellation = delivery },
                        onInspect: { deliveryForDetails = delivery },
                        onRevealAddress: { try await store.address(for: delivery) },
                        currentOperatorID: operatorID,
                        canReassign: isManager,
                        canCancel: environment.session.operatorSession?.roles.contains(where: {
                            ["owner", "admin"].contains($0.lowercased())
                        }) == true
                    )
                }
                .listStyle(.plain)
                .refreshable { await store.load() }
            }
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Deliveries")
        .task(id: operatorID) {
            store.configure(operatorID: operatorID)
            await store.load()
            while !Task.isCancelled {
                await store.pollServerReminders()
                try? await Task.sleep(for: .seconds(30))
                guard !Task.isCancelled else { break }
                // Periodic assignment reconciliation cancels reminders on an
                // outgoing operator's device after a manager shifts ownership.
                await store.load()
            }
        }
        .sheet(item: $deliveryForUber) { delivery in
            CourierWaitSheet(delivery: delivery) { minutes in
                Task { await store.markUberOrdered(delivery, waitMinutes: minutes) }
            }
        }
        .sheet(item: $deliveryForCancellation) { delivery in
            DeliveryCancellationSheet(delivery: delivery) { reason in
                Task { await store.cancel(delivery, reason: reason) }
            }
        }
        .sheet(item: $deliveryForDetails) { delivery in
            DeliveryDetailSheet(delivery: delivery, store: store)
        }
        .alert("Delivery update failed", isPresented: .init(
            get: { store.error != nil && !store.deliveries.isEmpty },
            set: { if !$0 { store.error = nil } }
        )) {
            Button("OK", role: .cancel) { store.error = nil }
        } message: {
            Text(store.error ?? "Try again.")
        }
        .alert("Uber ordered", isPresented: .init(
            get: { store.localWarning != nil },
            set: { if !$0 { store.localWarning = nil } }
        )) {
            Button("OK", role: .cancel) { store.localWarning = nil }
        } message: {
            Text(store.localWarning ?? "The server update succeeded, but this device needs attention.")
        }
        .alert("Delivery reminder", isPresented: .init(
            get: { store.serverReminder != nil },
            set: { _ in }
        )) {
            Button("Acknowledge") {
                guard let notification = store.serverReminder else { return }
                Task { await store.acknowledgeServerReminder(notification) }
            }
        } message: {
            Text(store.serverReminder?.message ?? "A delivery needs attention.")
        }
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: store.isLoading)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: store.error != nil)
    }
}

private struct DeliveryQueueRow: View {
    let delivery: DRXDelivery
    let onAssign: () -> Void
    let onOrderUber: () -> Void
    let onHandOff: () -> Void
    let onDeliver: () -> Void
    let onCancel: () -> Void
    let onInspect: () -> Void
    let onRevealAddress: () async throws -> String
    let currentOperatorID: String?
    let canReassign: Bool
    let canCancel: Bool
    @State private var revealedAddress: String?
    @State private var addressError: String?

    private var isDispatchOverdue: Bool {
        delivery.status == .readyForDispatch && (delivery.dispatchDueAt ?? .greatestFiniteMagnitude) < Date.now.timeIntervalSince1970 * 1000
    }

    private var isAssignedToCurrentOperator: Bool {
        guard let currentOperatorID else { return false }
        return delivery.assignedToUserId == currentOperatorID
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button(action: onInspect) {
                    HStack(spacing: 6) {
                        Text(delivery.safeDisplayOrderNumber)
                            .font(.headline.monospaced())
                            .foregroundStyle(DRXPalette.ink)
                        Image(systemName: "info.circle")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.accent)
                    }
                }
                .buttonStyle(DRXQuietButtonStyle())
                .accessibilityLabel("View details and audit history for \(delivery.safeDisplayOrderNumber)")

                Spacer()
                Text(isDispatchOverdue ? "ORDER UBER NOW" : delivery.status.label.uppercased())
                    .font(.caption2.bold())
                    .foregroundStyle(isDispatchOverdue ? DRXPalette.warning : DRXPalette.accent)
            }

            Text(revealedAddress ?? delivery.addressLabel)
                .font(.subheadline)
                .foregroundStyle(DRXPalette.ink)
                .textSelection(.enabled)

            Text(isAssignedToCurrentOperator
                 ? "Assigned to you"
                 : delivery.assignedToUserId == nil ? "Unassigned" : "Assigned to another operator")
                .font(.caption)
                .foregroundStyle(DRXPalette.muted)

            Button(revealedAddress == nil ? "View delivery address" : "Hide address") {
                if revealedAddress != nil {
                    revealedAddress = nil
                } else {
                    Task {
                        do { revealedAddress = try await onRevealAddress() }
                        catch { addressError = error.localizedDescription }
                    }
                }
            }
            .font(.caption.weight(.semibold))

            HStack {
                Text("Vendor \(formatDeliveryCents(delivery.vendorFeeCents))")
                Spacer()
                if let estimatedArrivalAt = delivery.estimatedArrivalAt {
                    Text("ETA \(Date(timeIntervalSince1970: estimatedArrivalAt / 1000).formatted(date: .omitted, time: .shortened))")
                } else if let dispatchDueAt = delivery.dispatchDueAt {
                    Text("Dispatch by \(Date(timeIntervalSince1970: dispatchDueAt / 1000).formatted(date: .omitted, time: .shortened))")
                }
            }
            .font(.caption)
            .foregroundStyle(DRXPalette.muted)

            HStack(spacing: 8) {
                if delivery.isOpen,
                   delivery.assignedToUserId != currentOperatorID,
                   (delivery.assignedToUserId == nil || canReassign) {
                    Button(delivery.assignedToUserId == nil ? "Assign to me" : "Take over shift", action: onAssign)
                        .buttonStyle(.bordered)
                }
                if isAssignedToCurrentOperator {
                    switch delivery.status {
                    case .readyForDispatch:
                        Button("Uber ordered", action: onOrderUber).buttonStyle(.borderedProminent)
                    case .uberOrdered:
                        Button("Package handed off", action: onHandOff).buttonStyle(.borderedProminent)
                    case .handedOff:
                        Button("Mark delivered", action: onDeliver).buttonStyle(.borderedProminent)
                    case .delivered, .canceled:
                        EmptyView()
                    }
                }
                if delivery.isOpen && canCancel {
                    Spacer()
                    Button("Cancel", role: .destructive, action: onCancel).buttonStyle(.borderless)
                }
            }
            .font(.caption.weight(.semibold))
        }
        .padding(.vertical, 6)
        .alert("Address unavailable", isPresented: .init(
            get: { addressError != nil },
            set: { if !$0 { addressError = nil } }
        )) {
            Button("OK", role: .cancel) { addressError = nil }
        } message: {
            Text(addressError ?? "Try again.")
        }
    }
}

private struct CourierWaitSheet: View {
    let delivery: DRXDelivery
    let onSave: (Int) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var waitMinutes = "15"

    var body: some View {
        NavigationStack {
            Form {
                Section("Courier wait time") {
                    TextField("Minutes", text: $waitMinutes)
                        .keyboardType(.numberPad)
                    HStack {
                        ForEach([5, 10, 15, 20, 30], id: \.self) { minutes in
                            Button("\(minutes)m") { waitMinutes = String(minutes) }
                                .buttonStyle(.bordered)
                        }
                    }
                }
                Section {
                    Text("The assigned operator is reminded two minutes before this wait time ends, at the ETA, and every five minutes while overdue.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(delivery.safeDisplayOrderNumber)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let minutes = Int(waitMinutes), (2...1_440).contains(minutes) else { return }
                        onSave(minutes)
                        dismiss()
                    }
                    .disabled(Int(waitMinutes).map { !(2...1_440).contains($0) } ?? true)
                }
            }
        }
    }
}

private struct DeliveryCancellationSheet: View {
    let delivery: DRXDelivery
    let onCancel: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var reason = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Cancellation reason") {
                    TextField("Required reason", text: $reason, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section {
                    Text("Canceling fulfillment does not rewrite the completed sale. Refunds and vendor credits are recorded separately.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(delivery.safeDisplayOrderNumber)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Back") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Cancel delivery", role: .destructive) {
                        onCancel(reason.trimmingCharacters(in: .whitespacesAndNewlines))
                        dismiss()
                    }
                    .disabled(reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

private struct DeliveryDetailSheet: View {
    let delivery: DRXDelivery
    let store: DeliveryQueueStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var details: DRXDeliveryDetailResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading delivery audit log…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .transition(.opacity)
                } else if let errorMessage {
                    ContentUnavailableView(
                        "Audit details unavailable",
                        systemImage: "exclamationmark.triangle.fill",
                        description: Text(errorMessage)
                    )
                } else if let details {
                    List {
                        Section("Fulfillment Summary") {
                            LabeledContent("Order", value: details.delivery.safeDisplayOrderNumber)
                            LabeledContent("Status", value: details.delivery.status.label)
                            LabeledContent("Vendor Expense", value: formatDeliveryCents(details.delivery.vendorFeeCents))
                            LabeledContent("Customer Fee", value: formatDeliveryCents(details.delivery.customerFeeCents))
                            if let dispatchDueAt = details.delivery.dispatchDueAt {
                                LabeledContent("Dispatch Due", value: Date(timeIntervalSince1970: dispatchDueAt / 1000).formatted(date: .abbreviated, time: .shortened))
                            }
                            if let eta = details.delivery.estimatedArrivalAt {
                                LabeledContent("Courier ETA", value: Date(timeIntervalSince1970: eta / 1000).formatted(date: .abbreviated, time: .shortened))
                            }
                            if let handedOffAt = details.delivery.handedOffAt {
                                LabeledContent("Handed Off", value: Date(timeIntervalSince1970: handedOffAt / 1000).formatted(date: .abbreviated, time: .shortened))
                            }
                            if let deliveredAt = details.delivery.deliveredAt {
                                LabeledContent("Delivered", value: Date(timeIntervalSince1970: deliveredAt / 1000).formatted(date: .abbreviated, time: .shortened))
                            }
                        }

                        if !details.events.isEmpty {
                            Section("Audit Events") {
                                ForEach(details.events) { event in
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(event.type.replacingOccurrences(of: "_", with: " ").capitalized)
                                                .font(.subheadline.bold())
                                                .foregroundStyle(DRXPalette.ink)
                                            Spacer()
                                            Text(Date(timeIntervalSince1970: event.createdAt / 1000).formatted(date: .omitted, time: .shortened))
                                                .font(.caption2)
                                                .foregroundStyle(DRXPalette.muted)
                                        }
                                        if let from = event.fromStatus, let to = event.toStatus {
                                            Text("\(from) → \(to)")
                                                .font(.caption)
                                                .foregroundStyle(DRXPalette.accent)
                                        }
                                        if !event.metadata.isEmpty && event.metadata != "{}" {
                                            Text(event.metadata)
                                                .font(.caption2.monospaced())
                                                .foregroundStyle(DRXPalette.muted)
                                                .lineLimit(2)
                                        }
                                    }
                                    .padding(.vertical, 2)
                                }
                            }
                        }

                        if !details.adjustments.isEmpty {
                            Section("Financial Adjustments") {
                                ForEach(details.adjustments) { adj in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(adj.kind.replacingOccurrences(of: "_", with: " ").capitalized)
                                                .font(.subheadline.bold())
                                            Text(adj.reason)
                                                .font(.caption)
                                                .foregroundStyle(DRXPalette.muted)
                                        }
                                        Spacer()
                                        Text(formatDeliveryCents(adj.amountCents))
                                            .font(.subheadline.monospacedDigit())
                                            .foregroundStyle(DRXPalette.warning)
                                    }
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: isLoading)
            .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: errorMessage != nil)
            .navigationTitle("Audit Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                do {
                    details = try await store.fetchDetails(for: delivery)
                } catch {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
            }
        }
    }
}

private func formatDeliveryCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100)
}

private struct PlaceholderView: View {
    let title: String
    let symbol: String
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        ZStack {
            DRXPalette.canvas.ignoresSafeArea()

            VStack(spacing: 18) {
                Image(systemName: symbol)
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(DRXPalette.accent)
                    .frame(width: 68, height: 68)
                    .background(DRXPalette.surface, in: RoundedRectangle(cornerRadius: 18))

                Text(title)
                    .font(.title2.bold())
                    .foregroundStyle(DRXPalette.ink)

                Text("Native feature wiring is in progress.")
                    .font(.subheadline)
                    .foregroundStyle(DRXPalette.muted)
            }
            .padding(32)
            .frame(maxWidth: 360)
            .background(DRXPalette.card, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
        }
        .navigationTitle(title)
        .onAppear { environment.telemetry.screen(title) }
    }
}

#Preview("Signed Out") {
    AppRootView(environment: .preview())
        .environment(Clerk.preview { preview in
            preview.isSignedIn = false
        })
}

#Preview("Signed In") {
    AppRootView(environment: .preview())
        .environment(Clerk.preview())
}
