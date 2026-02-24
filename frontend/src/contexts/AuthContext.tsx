import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { setApiUserId } from '../api'

interface AuthContextType {
    session: Session | null
    user: User | null
    userId: string | null
    username: string | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null, user: null, userId: null, username: null, loading: true,
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUsername = async (userId: string) => {
        const { data } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('id', userId)
            .single()
        setUsername(data?.username ?? null)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setApiUserId(session?.user?.id ?? null)
            if (session?.user) fetchUsername(session.user.id)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setApiUserId(session?.user?.id ?? null)
            if (session?.user) fetchUsername(session.user.id)
            else setUsername(null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setApiUserId(null)
        setUsername(null)
    }

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            userId: session?.user?.id ?? null,
            username,
            loading,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
