import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

if(window.location.hash){
 const hash = window.location.hash
 if(hash.includes("access_token")){
  // Force reload to trigger Supabase parser
  window.location.replace(
   window.location.origin + "/auth/callback"
  )
 }
}

export default function AuthCallback(){

 useEffect(()=>{
  const finishAuth = async ()=>{
   try{
    console.log("Session:", await supabase.auth.getSession())

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
