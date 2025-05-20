import { createContext } from "react";

export type AuthContextType = {
    token: string | null;
    email: string | null;
    setToken: (t: string | null) => void;
    setEmail: (e: string | null) => void;
};
export const AuthContext = createContext<AuthContextType>({
    token: null,
    email: null,
    setToken: () => { },
    setEmail: () => { },
});