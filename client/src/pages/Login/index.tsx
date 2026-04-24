import { Box, Button, Card, Divider, FormControl,  Link, Typography } from "@mui/material";
import { GoogleIcon } from "~/components/CustomIcons";
import {useForm} from "react-hook-form";
import {LoginSchema} from "~/utils/rules";
import { alpha } from '@mui/material/styles';
import {yupResolver} from '@hookform/resolvers/yup';
import Input from "~/components/Input";
import type { FormLogin } from "~/types/FormLogin.type";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginAccount } from "~/apis/auth.api";
import { isAxiosUnprocessableEntityError } from "~/utils/error";
import type { ErrorResponseApi } from "~/types/utils.type";
import { AppContext } from "~/contexts/app.context";
import { useContext } from "react";
import { useNavigate, useLocation } from "react-router";
import { setProfileToLS } from "~/utils/auth";
import AppButton from "~/components/AppButton";
import { toast } from "react-toastify";

const Login = () => {
    const { setIsAuthenticated, setProfile } = useContext(AppContext);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const {register, handleSubmit,setError, formState: {errors}} = useForm<FormLogin>({
        resolver: yupResolver(LoginSchema)
    });
    const loginAccountMutation = useMutation({
        mutationFn: (body: FormLogin) =>{
            return loginAccount(body)
        }
    })
    const onSubmit = handleSubmit((data: FormLogin)=>{
        loginAccountMutation.mutate(data, {
            onSuccess: (response) => {
                const user = response.data.data;
                setIsAuthenticated(true);
                setProfile(user);
                setProfileToLS(user);
                queryClient.setQueryData(['me'], response);
                
                // 🚀 REDIRECT BACK LOGIC
                const from = (location.state as any)?.from?.pathname || '/';
                navigate(from, { replace: true });
            },
            onError: (error) => {
                if (isAxiosUnprocessableEntityError<ErrorResponseApi<FormLogin>>(error)) {
                    const formError = error.response?.data.data;
                    if (formError) {
                        Object.keys(formError).forEach((key) => {
                            setError(key as keyof FormLogin, {
                                message: formError[key as keyof FormLogin],
                                type: "Server",
                            });
                        });
                    } else {
                        toast.error(error.response?.data.message || "Đăng nhập thất bại");
                    }
                } else {
                    toast.error("Đã có lỗi xảy ra. Vui lòng thử lại!");
                }
            }
        });
    });

            
        
    return ( 

           <Card variant = 'outlined' className="flex flex-col p-10 gap-4 w-[100%]"
            sx = {{ 
                bgcolor: (theme) => theme.palette.background.paper,
                boxShadow: (theme) => theme.shadows[1],
            }}
           >
                    <Typography variant="h4" sx = {{ fontWeight: 'bold'}}>Sign In</Typography>
                    <Box
                        component="form"
                        sx = {{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 2,
                         
                        }}

                        onSubmit={onSubmit}
                    >
                        <FormControl sx = {{display: 'flex', flexDirection: 'column', gap: 2}}>
                        
                        <Input
                            type = "text"
                            placeholder="Email"
                            autoComplete="email"
                            name = "email"
                            
                            error = {errors.email ? true : false}
                            helperText = {errors.email?.message}
                            label="Email"
                            register = {register}
                        />                             
                    

                        <Input
                            type = "password"
                            placeholder="Password"
                            autoComplete="new-password"
                            name = "password"
                            error = {errors.password ? true : false}
                            helperText = {errors.password?.message}
                            label="Password"
                            register = {register}
                        />                       
                
                        </FormControl>
                        <AppButton
                          type='submit'
                          loading={loginAccountMutation.isPending}
                          sx={{
                            mt: 1,
                            mb: 0,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 900,
                            bgcolor: 'primary.main',
                            boxShadow: (theme) => `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                            '&:hover': {
                              bgcolor: 'primary.dark',
                              transform: 'translateY(-2px)',
                              boxShadow: (theme) => `0 12px 30px ${alpha(theme.palette.primary.main, 0.5)}`
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          SIGN IN
                        </AppButton>
                        <Divider>or</Divider>
                        <Button 
                            fullWidth
                            variant="outlined"
                            color = "inherit"
                            startIcon = {<GoogleIcon />}
                            sx = {{padding: 1}}
                        >
                            Sign in with Google
                        </Button>
                        <Typography sx = {{display: 'flex', justifyContent: 'center', gap: 1}}>
                            Don't have an account?
                            <Link href="/register" color = "inherit"  sx = {{alignSelf: 'center', fontWeight: 'bold'}}>Sign-up</Link>
                        </Typography>
                    </Box>
                </Card>

    );
}

export default Login;