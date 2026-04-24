import { Pagination as MuiPagination } from "@mui/material";
import useQueryParams from "~/hooks/useQueryParams";


interface Props{
    pageSize: number;
}
const Pagination = ({pageSize}: Props) => {
    const {updateParams, queryParams} = useQueryParams();

    const page = Number(queryParams.page)|| 1
    const handleChange = (_e: unknown, value: number) => {
        updateParams({page: value.toString()})
        
    }
    return (
        <MuiPagination count={pageSize} color="primary" onChange={handleChange} page={page}/>
    )
}

export default Pagination;