export interface NemligCampaign {
  MinQuantity: number
  MaxQuantity: number
  TotalPrice: number
  VariousPriceProductsCampaign: boolean
  CampaignPrice: number
  CampaignUnitPrice: number | null
  Type: string
  Code: string | null
  DiscountSavings: number
  IntervalStart: string | null
  IntervalEnd: string | null
  ShowCampaignInterval: boolean
}

export interface NemligProduct {
  Id: string
  Name: string
  Brand: string | null
  Category: string | null
  SubCategory: string | null
  Url: string | null
  PrimaryImage: string | null
  /** "200 g / Aalbæk Specialiteter" */
  Description: string | null
  Price: number
  /** "122,50 kr./Kg." */
  UnitPrice: string | null
  UnitPriceCalc: number | null
  UnitPriceLabel: string | null
  DiscountItem: boolean
  DiscountSavings?: number | null
  Campaign: NemligCampaign | null
  CampaignAttribute?: string | null
  Labels: string[] | null
  Availability?: {
    IsDeliveryAvailable: boolean
    IsAvailableInStock: boolean
    ReasonMessageKeys?: string[]
  } | null
  ProductMainGroupNumber?: string | null
  ProductMainGroupName?: string | null
  ProductCategoryGroupNumber?: string | null
  ProductCategoryGroupName?: string | null
  ProductSubGroupNumber?: string | null
  ProductSubGroupName?: string | null
}

export interface NemligMenuItem {
  Id: string
  Url: string
  Text: string
  Children?: NemligMenuItem[] | null
}

/** Menu leaf with the top-level department it was found under. */
export interface NemligCategoryPage {
  url: string
  department: string
}

export interface NemligCatalogEntry {
  product: NemligProduct
  department: string
}
