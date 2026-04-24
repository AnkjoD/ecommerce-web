import React from 'react'
import { Grid, Box, Stack, Container } from '@mui/material'
import SortProductList from './SortProductList'
import AsideFilter from './AsideFilter'
import ProductBox from '~/components/ProductBox'
import useQueryParams from '~/hooks/useQueryParams'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import productApi from '~/apis/product.api'
import Pagination from '~/components/Pagination'
import { type ProductsConfig, type ProductFull } from '~/types/product.type'
import categoryApi from '~/apis/category.api'
import ProductListSkeleton from './ProductListSkeleton'
import AsideFilterSkeleton from './AsideFilterSkeleton'
import { useRef, useState, useEffect } from 'react'
import { Drawer, useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'

const ProductList = () => {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [openFilter, setOpenFilter] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)
  const { queryParams }: { queryParams: ProductsConfig } = useQueryParams()
  const prevNameRef = useRef(queryParams.name)

  // 🔄 AUTO-CLOSE MOBILE FILTER WHEN RESIZING TO DESKTOP (INSTANT HIDE)
  useEffect(() => {
    if (isDesktop && openFilter) {
      setShouldAnimate(false) // Tắt hiệu ứng khi resize
      setOpenFilter(false)
      // Reset lại hiệu ứng sau khi Drawer đã đóng
      setTimeout(() => setShouldAnimate(true), 300)
    }
  }, [isDesktop, openFilter])
  const apiParams = React.useMemo(() => {
    const { sort_by, rating_filter, min_price, max_price, category, ...rest } = queryParams
    const sortMap: Record<string, string> = {
      'createdAt': 'created_at',
      'price': 'price',
      'view': 'view_count',
      'sold': 'sold_count'
    }
    return { 
      ...rest, 
      sort: sortMap[sort_by as string] || 'created_at',
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      rating_filter: rating_filter ? Number(rating_filter) : undefined,
      category: category || undefined,
      page: queryParams.page ? Number(queryParams.page) : undefined,
      limit: queryParams.limit ? Number(queryParams.limit) : undefined
    }
  }, [queryParams])

  const { data } = useQuery({
    queryKey: ['products', apiParams],
    queryFn: () => productApi.getProducts(apiParams),
    placeholderData: prevNameRef.current ? undefined : keepPreviousData,
    staleTime: 1000 * 60 * 3
  })

  // 💎 ELITE SMOOTH SCROLL: Chỉ cuộn khi dữ liệu thực sự thay đổi
  React.useEffect(() => {
    if (data) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [data])

  const productsResponse = data?.data?.data
  const products = productsResponse?.data as ProductFull[] || []
  const totalPages = productsResponse?.total_pages || 0

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => {
      return categoryApi.getCategories()
    },
    staleTime: Infinity
  })

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth='xl'>
        <Grid container spacing={3}>
          {/* 🖥️ Desktop Side Filter */}
          <Grid size={{ xs: 12, md: 2.5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            {isLoadingCategories ? <AsideFilterSkeleton /> : <AsideFilter categories={categoriesData?.data.data} />}
          </Grid>

          {/* 📱 Mobile Filter Drawer */}
          <Drawer
            anchor='left'
            open={openFilter}
            onClose={() => {
              setShouldAnimate(true)
              setOpenFilter(false)
            }}
            transitionDuration={shouldAnimate ? undefined : 0}
            PaperProps={{
              sx: { 
                width: { xs: '85vw', sm: 360 }, 
                bgcolor: (theme) => alpha(theme.palette.background.default, 0.7),
                backdropFilter: 'blur(20px) saturate(160%)',
                backgroundImage: 'none',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.1)',
                borderLeft: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }
            }}
          >
            {isLoadingCategories ? (
               <Box sx={{ p: 2 }}><AsideFilterSkeleton /></Box>
            ) : (
               <AsideFilter 
                categories={categoriesData?.data.data} 
                isMobile 
                onClose={() => setOpenFilter(false)} 
               />
            )}
          </Drawer>

          <Grid size={{ xs: 12, md: 9.5 }}>
            <Stack spacing={2}>
              {/* 🛠️ PREMIUM CONTROL HUB (Filter + Sort) */}
              {productsResponse && (
                <SortProductList 
                  pageSize={totalPages} 
                  onOpenFilter={() => setOpenFilter(true)} 
                />
              )}

              {data ? (
                <Grid container spacing={1}>
                  {products.map((product) => (
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={product.id}>
                      <ProductBox data={product} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <ProductListSkeleton />
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                {productsResponse && <Pagination pageSize={totalPages} />}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default ProductList
