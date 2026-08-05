import SwiftUI
import WebKit

struct DRXWebView: UIViewRepresentable {
    let url: URL
    let token: String?

    func makeUIView(context: Context) -> WKWebView {
        // Create custom configuration
        let configuration = WKWebViewConfiguration()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator

        // Allow bounces
        webView.scrollView.bounces = true

        // Initial load
        loadRequest(in: webView)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // If target url is different from currently loading/loaded url, load the new request
        if uiView.url != url && !uiView.isLoading {
            loadRequest(in: uiView)
        }
    }

    private func loadRequest(in webView: WKWebView) {
        Task { @MainActor in
            let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
            let domain = url.host ?? ""
            let isSecure = url.scheme == "https"

            if let token = token, !token.isEmpty {
                // Set __session cookie
                let sessionCookie = HTTPCookie(properties: [
                    .name: "__session",
                    .value: token,
                    .domain: domain,
                    .path: "/",
                    .secure: isSecure
                ])

                // Set __client_uat cookie
                let uat = String(Int(Date().timeIntervalSince1970))
                let uatCookie = HTTPCookie(properties: [
                    .name: "__client_uat",
                    .value: uat,
                    .domain: domain,
                    .path: "/",
                    .secure: isSecure
                ])

                if let sessionCookie {
                    await cookieStore.setCookie(sessionCookie)
                }
                if let uatCookie {
                    await cookieStore.setCookie(uatCookie)
                }
            }

            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: DRXWebView

        init(_ parent: DRXWebView) {
            self.parent = parent
        }

        @MainActor
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }
    }
}
