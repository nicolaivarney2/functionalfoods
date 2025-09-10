# Netto API Research - JADX Findings

## Search Results Summary

### BaseURL Search Results:
- **Total Results:** ~50+ matches
- **Key Findings:**
  - `dk.sg.cp.BuildConfig` - Salling Group configuration
  - `com.shopgun.android.sdk.api.Environment` - ShopGun SDK (Salling Group's API)
  - `dk.dsg.idp.IDPHelper.getBaseUrl()` - Identity Provider authentication
  - `retrofit2.Retrofit.baseUrl()` - HTTP client configuration

### api.sallinggroup.com Search Results:
- **Total Results:** 1 match
- **Key Finding:** `dk.sg.cp.BuildConfig` - Contains Salling Group API configuration

### https:// Search Results:
- **Total Results:** ~20+ matches
- **Key Findings:**
  - `com.shopgun.android.sdk.api.Environment` - API environment configuration
  - `dk.sg.cp.BuildConfig` - Build configuration
  - `com.github.shortiosdk.ConstantsKt` - Constants file

### dk.dsg.netto Search Results:
- **Total Results:** ~5+ matches
- **Key Findings:**
  - `androidx.appcompat.R.styleable` - UI styling
  - `androidx.asynclayoutinflater.R.styleable` - Layout inflation
  - `androidx.autofill.R.styleable` - Autofill functionality
  - `androidx.biometric.R.styleable` - Biometric authentication

## Key API Endpoints Found:

### 1. Salling Group API (BuildConfig):
- **MEMBERSHIP_BARCODE_API**: `https://api.sallinggroup.com/`
- **CP_BACKEND_API**: `https://p-club.dsgapps.dk/`
- **IDP_ADMIN_API**: `https://idp.dsgapps.dk/`
- **IDP_LOGIN_ENTRYPOINT_URL**: `https://p-idp.dsgapps.dk/apps?clientId=customer-program&tenantId=%s&channel=CustomerProgram&clientFlow=gigya&nonce=%s&clientTraceId=%s&emailOrPhone=%s&code_challenge_method=S256&code_challenge=%s`

### 2. ShopGun API (Environment):
- **PRODUCTION**: `https://api.etilbudsavis.dk`
- **EDGE**: `https://api-edge.etilbudsavis.dk`
- **STAGING**: `https://api-staging.etilbudsavis.dk`
- **CUSTOM**: `https://api.etilbudsavis.dk`

### 3. Authentication (IDPHelper):
- **Client ID**: `scan-and-go-native`
- **Base URL**: Retrieved from `ResourceProvider.INSTANCE.getConfigValueString(R.string.IDP_LOGIN_URL)`
- **Tenant ID**: Retrieved from `ResourceProvider.INSTANCE.getConfigValueInt(R.integer.TENANT_ID)`

### 4. Other Important URLs:
- **Algolia Search**: `F9VBJLR1BK` (App ID)
- **Firestore Collections**: Multiple collections for products, offers, shopping lists
- **Zendesk Support**: `https://netto-plus.zendesk.com/`

## Next Steps:
1. **Test Salling Group API** with the found endpoints
2. **Examine ShopGun API** for product data
3. **Find authentication tokens** and headers
4. **Test API calls** with discovered endpoints

## Priority APIs to Test:
1. **https://api.sallinggroup.com/** - Main Salling Group API
2. **https://api.etilbudsavis.dk** - ShopGun API (product data)
3. **https://p-club.dsgapps.dk/** - Customer Program API
