package com.stockpredictorai.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        super.onCreate(savedInstanceState);

        // Enable Third-Party Cookies for cross-site sessions (localhost <-> fly.dev)
        android.webkit.WebView webView = (android.webkit.WebView) this.bridge.getWebView();
        android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        cookieManager.setAcceptCookie(true);
        cookieManager.flush();
    }

    @Override
    public void onPause() {
        super.onPause();
        android.webkit.CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        android.webkit.CookieManager.getInstance().flush();
    }

    @Override
    public void onResume() {
        super.onResume();
        android.webkit.CookieManager.getInstance().flush();
    }
}
