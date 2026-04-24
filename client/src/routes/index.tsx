import {
    createBrowserRouter,
} from 'react-router'
import path from '~/constants/path'
import {PrivateRoute, RejectedRoute} from './Protected';
import {lazy, Suspense} from 'react'
//Layout
import AuthLayout from '~/layouts/AuthLayout';
import MainLayout from '~/layouts/MainLayout';
import UserLayout from '~/layouts/UserLayout';

//Pages
const Login = lazy(() => import('~/pages/Login'))
const Register = lazy(() => import('~/pages/Register'))
const Home = lazy(() => import('~/pages/Home'))
const ProductList = lazy(() => import('~/pages/ProductList'))
const Profile = lazy(() => import('~/pages/Profile'))
const ProductDetail = lazy(() => import('~/pages/ProductDetail'))
const Cart = lazy(() => import('~/pages/Cart'))
const ChangePassword = lazy(() => import('~/pages/ChangePassword'))
const AddressList = lazy(() => import('~/pages/AddressList'))
const Purchase = lazy(() => import('~/pages/Purchase'))
const NotFound = lazy(() => import('~/pages/NotFound'))
const PaymentResult = lazy(() => import('~/pages/PaymentResult'))


const router = createBrowserRouter([
    {
        path: '',
        Component: RejectedRoute,
        children: [
            {
                path: '',
                Component: AuthLayout,
                children: [
                    {
                        path: path.login,
                        element: (
                            <Suspense>
                                <Login />
                            </Suspense>
                        )
                    },
                    {
                        path: path.register,
                        element: (
                            <Suspense>
                                <Register />
                            </Suspense>
                        )
                    }
                ]
            }
        ]

    },
    {
        path: '',
        Component: PrivateRoute,
        children:[
            {
                path: "",
                Component: UserLayout,
                children: [
                    {
                        path: path.profile,
                        element: (
                            <Suspense>
                                <Profile />
                            </Suspense>
                        )
                    },
                    {
                        path: path.changePassword,
                        element: (
                            <Suspense>
                                <ChangePassword />
                            </Suspense>
                        )
                    },
                    {
                        path: path.address,
                        element: (
                            <Suspense>
                                <AddressList />
                            </Suspense>
                        )
                    },
                    {
                        path: path.purchase,
                        element: (
                            <Suspense>
                                <Purchase />
                            </Suspense>
                        )
                    }
                ]
            },
            {
                path: "",
                Component: MainLayout,
                children: [
                    {
                        path: path.cart,
                        element: (
                            <Suspense>
                                <Cart />
                            </Suspense>
                        )
                    },
                    {
                        path: path.paymentResult,
                        element: (
                            <Suspense>
                                <PaymentResult />
                            </Suspense>
                        )
                    }
                ]
            }
        ]
    },

    {
        path: '',
        Component: MainLayout,
        children: [
            {
                index: true,
                element: (
                    <Suspense>
                        <Home />
                    </Suspense>
                )
            },
            {
                path: path.products,
                element: (
                    <Suspense>
                        <ProductList />
                    </Suspense>
                )
            },
            {
                path: path.productDetail,
                element: (
                    <Suspense>
                        <ProductDetail />
                    </Suspense>
                )
            },
             {
                path: "*",
                element: (
                    <Suspense>
                        <NotFound />
                    </Suspense>
                )
            }
        ]
    },

])

export default router;