import React ,{useContext, useEffect, useState} from "react"
import {auth } from 'firebase'

const AuthContext = React.createContext()

export function useAuth(){
    return useContext(AuthContext)
}

export function AuthProvider({childern}){
    const [CurrentUser,setCurrentUser] = useState()
    
    function signup(email, password){
        return auth.createUserWithEmailAndPassword(email,password)
    }

    useEffect(()=>{
        const unsubcribe =auth.onAuthStateChanged(user =>{
            setCurrentUser(user)
    })
    return unsubcribe 
    },[])

    const Value ={
        CurrentUser,
        signup
    }

    return (
        <AuthContext.Provider value = {value}>
            {childern}
        </AuthContext.Provider>
    )
}