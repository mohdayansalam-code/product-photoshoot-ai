import { useEffect } from "react"
import { supabase } from "@/lib/supabase"


export default function AuthCallback(){

 useEffect(()=>{
  const finishAuth = async ()=>{
   try{
    // Parse session from URL
    const { data , error } = await supabase.auth.getSession()

    if(error){
     console.error(error)
    }

    if(data?.session){
     // Clean URL
     window.history.replaceState({}, document.title, "/dashboard")
     // Hard redirect
     window.location.replace("/dashboard")
    } else {
     window.location.replace("/auth")
    }

   }catch(e){
    console.error(e)
    window.location.replace("/auth")
   }
  }

  finishAuth()

 },[])

 return <div>Signing you in...</div>

}
