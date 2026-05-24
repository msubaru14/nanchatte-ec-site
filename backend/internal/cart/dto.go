package cart

import "github.com/msubaru14/nanchatte-ec-backend/internal/product"

type addItemRequest struct {
	ProductID int64 `json:"productId"`
	Quantity  int   `json:"quantity"`
}

type updateItemQuantityRequest struct {
	Quantity int `json:"quantity"`
}

type cartResponse struct {
	Items       []cartItemResponse `json:"items"`
	TotalAmount int                `json:"totalAmount"`
}

type cartItemResponse struct {
	ProductID         int64               `json:"productId"`
	Name              string              `json:"name"`
	ImageURL          *string             `json:"imageUrl"`
	PriceIncludingTax int                 `json:"priceIncludingTax"`
	StockStatus       product.StockStatus `json:"stockStatus"`
	Quantity          int                 `json:"quantity"`
	CanBePurchased    bool                `json:"canBePurchased"`
}

func newCartResponse(result *Result) cartResponse {
	items := make([]cartItemResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, cartItemResponse{
			ProductID:         item.ProductID,
			Name:              item.Name,
			ImageURL:          item.ImageURL,
			PriceIncludingTax: item.PriceIncludingTax,
			StockStatus:       item.StockStatus,
			Quantity:          item.Quantity,
			CanBePurchased:    item.CanBePurchased,
		})
	}

	return cartResponse{
		Items:       items,
		TotalAmount: result.TotalAmount,
	}
}
