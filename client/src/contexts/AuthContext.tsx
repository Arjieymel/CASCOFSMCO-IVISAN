import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from "react";
import type { UserDetails } from "../Interfaces/AuthInterface";
import AuthService from "../services/AuthService";

interface AuthContextType {
    user: UserDetails | null
    loading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined >(undefined)

export const AuthProvider: FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const login = async (username: string, password: string) => {
    try{
        const res= await AuthService.login({username, password})
        if(res.status === 200){
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
        } else {
            console.error('Unexpected status error occured during login:', res.status)
        }
    } catch (error) {
        console.error('Unexpected server error occured during login:', error)
        throw error
    }

  }

    const logout = async () => {
        try {
            const res = await AuthService.logout();
            if (res.status !== 200) {
                console.error(
                    'Unexpected status error occured during logging user out:',
                    res.status
                );
            }
        } catch (error) {
            console.error(
                'Unexpected server error occured during logging user out:',
                error
            );
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('remembered_username');
            sessionStorage.removeItem('remembered_username');
            setUser(null);
        }
    };

    const checkAuth = async () => {
        setLoading(true)

        const token = localStorage.getItem('token')

        if (token) {
            try {
                const res = await AuthService.me();

                if (res.status === 200) {
                    setUser(res.data.user);
                } else {
                    localStorage.removeItem('token')
                    setUser(null);
                    // For non-200 responses, treat as unauthenticated.
                    // (Commonly 401 when the token is expired/invalid.)
                    if (res.status !== 401) {
                        console.error(
                            'Unexpected status error occured during checking authentication:',
                            res.status
                        );
                    }
                }
            } catch (error) {
                localStorage.removeItem('token');
                setUser(null);

                const status = (error as any)?.response?.status;
                if (status !== 401) {
                    console.error(
                        'Unexpected server error occured during checking authentication:',
                        error
                    );
                }
            }

            setLoading(false);
        } else {
            setUser(null);
            setLoading(false);
        }
    };

    useEffect (() => {
        checkAuth()
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
        {children}
        </AuthContext.Provider>


    );
}; 

export const useAuth = () => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');

    }
 return context
};
