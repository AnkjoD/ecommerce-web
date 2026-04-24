import type {ProductsConfig, SuccessProductListResponse, SuccessProductResponse, SuccessVariantsResponse} from "~/types/product.type";
import http from "~/utils/http";


const PRODUCTS_URL = "/products";

const productApi = {
    getProducts: (params: ProductsConfig) => {
        return http.get<SuccessProductListResponse>(PRODUCTS_URL, {params});
    },
    getProduct: (productId: string) => {
        return http.get<SuccessProductResponse>(`${PRODUCTS_URL}/${productId}`);
    },
    getVariants: (parentProductId: string) => {
        return http.get<SuccessVariantsResponse>(`${PRODUCTS_URL}/${parentProductId}/variants`);
    }
}


export default productApi;