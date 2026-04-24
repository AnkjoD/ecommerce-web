import http from "~/utils/http";
import { type SuccessCategoryListResponse } from "~/types/category.type";
const categoryApi = {
    getCategories: ()=>{
        return http.get<SuccessCategoryListResponse>('/categories');
    }
}

export default categoryApi;