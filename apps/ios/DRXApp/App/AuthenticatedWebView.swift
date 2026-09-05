import SwiftUI
import ClerkKit

struct AuthenticatedWebView: View {
    let path: String
    let title: String

    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    @State private var token: String?
    @State private var isLoadingToken = true
    @State private var loadError: String?

    var body: some View {
        Group {
            if isLoadingToken {
                ZStack {
                    DRXPalette.canvas.ignoresSafeArea()
                    VStack(spacing: 16) {
                        ProgressView()
                            .tint(DRXPalette.accent)
                        Text("Connecting to \(title)…")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                    }
                }
            } else if let loadError {
                ZStack {
                    DRXPalette.canvas.ignoresSafeArea()
                    ContentUnavailableView {
                        Label("Connection Error", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                    } description: {
                        Text(loadError)
                            .foregroundStyle(DRXPalette.muted)
                    } actions: {
                        Button("Retry") {
                            loadSessionToken()
                        }
                        .buttonStyle(.drxPrimary)
                    }
                }
            } else {
                let baseURL = environment.configuration.apiBaseURL
                let fullURL = baseURL.appending(path: path)
                DRXWebView(url: fullURL, token: token)
                    .ignoresSafeArea(.all, edges: .bottom)
            }
        }
        .onAppear {
            loadSessionToken()
        }
    }

    private func loadSessionToken() {
        isLoadingToken = true
        loadError = nil

        Task {
            do {
                if let sessionToken = try await Clerk.shared.auth.getToken() {
                    self.token = sessionToken
                } else {
                    self.loadError = "Unable to retrieve Clerk session token."
                }
            } catch {
                self.loadError = error.localizedDescription
            }
            self.isLoadingToken = false
        }
    }
}
