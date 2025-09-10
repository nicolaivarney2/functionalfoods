# Netto API Research - Komplette Fund

## API Endpoints (Fundet)

### Salling Group APIs
- **CP API:** `https://p-club.dsgapps.dk/`
- **IDP API:** `https://idp.dsgapps.dk/`
- **Membership API:** `https://api.sallinggroup.com/`

### ShopGun APIs
- **Main API:** `https://api.etilbudsavis.dk`
- **Edge API:** `https://api-edge.etilbudsavis.dk`
- **Staging API:** `https://api-staging.etilbudsavis.dk`

## V4 Data Models (Komplette)

### OfferV4Decodable (Hovedmodellen)
```kotlin
data class OfferV4Decodable(
    val id: Id,                                    // String
    val name: String,
    val description: String?,
    val images: List<ImageV4>,
    @Json(name = "webshop_link") val webshop: String?,
    val price: Double,
    @Json(name = "currency_code") val currency: String,
    val savings: Double?,
    @Json(name = "piece_count") val pieceCount: PieceCount,
    @Json(name = "unit_symbol") val unitSymbol: QuantityUnit,
    @Json(name = "unit_size") val unitSize: UnitSize,
    val validity: Validity,
    @Json(name = "visible_from") val visibleFrom: ValidityDateStr,
    val business: BusinessV4Decodable
)
```

### BusinessV4Decodable (Butiksinfo)
```kotlin
data class BusinessV4Decodable(
    val id: Id,                                    // String
    val name: String,
    @Json(name = "primary_color") val primaryColor: String,
    @Json(name = "positive_logotypes") val logotypesForWhite: List<ImageV4>,
    @Json(name = "negative_logotypes") val logotypesForPrimary: List<ImageV4>,
    @Json(name = "country_code") val countryCode: String,
    @Json(name = "short_description") val description: String?,
    @Json(name = "website_link") val website: String?
)
```

### ImageV4 (Billeder)
```kotlin
data class ImageV4(
    val width: Int,           // Bredde i pixels
    val height: Int?,         // Højde i pixels (optional)
    val url: String          // Billede URL
)
```

### PieceCount (Stykantal)
```kotlin
data class PieceCount(
    val from: Double,    // Minimum antal styk
    val to: Double       // Maksimum antal styk
)
```

### QuantityUnit (Måleenheder - Enum)
```kotlin
enum class QuantityUnit(val unit: String, val symbol: String) {
    // Mass units
    Microgram("microgram", "μg"),
    Milligram("milligram", "mg"),
    Gram("gram", "g"),
    Kilogram("kilogram", "kg"),
    // Volume units
    Milliliter("milliliter", "mL"),
    Liter("liter", "L"),
    // ... (35 total units)
    Piece("piece", "pcs")
}
```

### UnitSize (Størrelse)
```kotlin
data class UnitSize(
    val from: Double,    // Minimum størrelse
    val to: Double       // Maksimum størrelse
)
```

### Validity (Gyldighed)
```kotlin
data class Validity(
    val from: ValidityDateStr?,  // Start dato (String)
    val to: ValidityDateStr?     // Slut dato (String)
)
```

### OfferV4DecodableContainer (Wrapper)
```kotlin
data class OfferV4DecodableContainer(
    val offer: OfferV4Decodable
)
```

## Type Aliases
```kotlin
typealias Id = String
typealias HexColorStr = String
typealias ValidityDateStr = String
typealias ValidityDate = OffsetDateTime
```

## JSON Field Mappings

### OfferV4Decodable
- `webshop_link` → `webshop`
- `currency_code` → `currency`
- `piece_count` → `pieceCount`
- `unit_symbol` → `unitSymbol`
- `unit_size` → `unitSize`
- `visible_from` → `visibleFrom`

### BusinessV4Decodable
- `primary_color` → `primaryColor`
- `positive_logotypes` → `logotypesForWhite`
- `negative_logotypes` → `logotypesForPrimary`
- `country_code` → `countryCode`
- `short_description` → `description`
- `website_link` → `website`

## V2 Endpoints (ShopGun SDK)
```java
public class Endpoints {
    public static final String OFFER_LIST = "/v2/offers";
    public static final String OFFER_ID = "/v2/offers/";
    public static final String OFFER_SEARCH = "/v2/offers/search";
    public static final String DEALER_LIST = "/v2/dealers";
    public static final String STORE_LIST = "/v2/stores";
    // ... flere V2 endpoints
}
```

## Manglende Information
- **V4 API endpoints** (ikke fundet endnu)
- **Authentication flow** (OAuth/JWT)
- **Request/Response examples**

## Næste Skridt
1. Find V4 API endpoints
2. Test authentication flow
3. Implementer Netto scraper med V4 API
4. Test med rigtige API calls

## Noter
- V4 API er meget mere moderne end V2
- Struktureret data med tydelige JSON mappings
- Komplet type safety med Kotlin data classes
- Omfattende måleenheder og validering

