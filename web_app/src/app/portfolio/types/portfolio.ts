export interface Asset {
    symbol: string
    name: string
    holdings: number
    currentPrice: number
    value: number
    change24h: number
  }
  
  export interface Transaction {
    date: string
    type: string
    asset: string
    amount: number
    value: number
  }
  
  export interface PortfolioStats {
    totalValue: number
    totalChange: number
    bestPerforming: {
      asset: string
      change: number
    }
    worstPerforming: {
      asset: string
      change: number
    }
    topGainer: {
      asset: string
      gainUSD: number
    }
  }
  
  