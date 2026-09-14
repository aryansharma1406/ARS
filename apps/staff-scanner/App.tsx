import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {configured,loadContext,supabase} from './src/api';
import type {StaffContext} from './src/types';
import Scanner from './src/Scanner';
import {c,ui} from './src/theme';

export default function App(){return <SafeAreaProvider><StatusBar style="light"/><Session/></SafeAreaProvider>;}
function Session(){
 const [staff,setStaff]=useState<StaffContext|null>(null),[loading,setLoading]=useState(configured),[error,setError]=useState('');
 const epoch=useRef(0);
 async function restore(){const run=++epoch.current;setLoading(true);try{const {data,error:authError}=await supabase.auth.getUser();if(authError||!data.user){if(run===epoch.current)setStaff(null);return;}const context=await loadContext();if(run===epoch.current){setStaff(context);setError('');}}catch(e){if(run===epoch.current){setStaff(null);setError(e instanceof Error?e.message:'Unable to restore staff access.');}}finally{if(run===epoch.current)setLoading(false);}}
 useEffect(()=>{
   if(!configured)return;
   void restore();
   const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){epoch.current++;setStaff(null);setLoading(false);}else if(event==='SIGNED_IN')setTimeout(()=>void restore(),0);});
   const state=AppState.addEventListener('change',next=>{if(next==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});
   if(AppState.currentState==='active')supabase.auth.startAutoRefresh();
   return()=>{epoch.current++;subscription.unsubscribe();state.remove();supabase.auth.stopAutoRefresh();};
 },[]);
 if(!configured)return <SafeAreaView style={ui.center}><Text style={ui.title}>ARS Door</Text><Text style={ui.error}>Configure the Supabase URL and public key in the mobile app environment before starting.</Text></SafeAreaView>;
 if(loading)return <SafeAreaView style={[ui.page,ui.center]}><ActivityIndicator color={c.gold}/><Text style={ui.muted}>Verifying staff access...</Text></SafeAreaView>;
 if(staff)return <Scanner staff={staff} onContext={setStaff} onSignOut={async()=>{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw new Error('Sign-out failed. Reconnect and try again.');setStaff(null);}}/>;
 return <Login error={error} onRestore={restore}/>;
}
function Login({error,onRestore}:{error:string;onRestore:()=>Promise<void>}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function login(){if(busy)return;setBusy(true);setMessage('');try{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw new Error('Sign-in failed. Check your staff email and password.');setPassword('');await onRestore();}catch(e){setMessage(e instanceof Error?e.message:'Unable to sign in.');}finally{setBusy(false);}}
 return <SafeAreaView style={ui.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[ui.center,{flexGrow:1}]} keyboardShouldPersistTaps="handled"><Text style={[ui.title,{fontSize:58,fontStyle:'italic',color:c.gold}]}>ARS</Text><Text style={ui.label}>DOOR OPERATIONS</Text><Text style={ui.title}>The night starts here.</Text><Text style={ui.muted}>Sign in with your assigned staff account. No customer registration or financial access.</Text><TextInput accessibilityLabel="Staff email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Staff email" placeholderTextColor={c.muted} style={ui.input}/><TextInput accessibilityLabel="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={c.muted} style={ui.input} onSubmitEditing={()=>void login()}/>{!!(message||error)&&<Text accessibilityRole="alert" style={ui.error}>{message||error}</Text>}<Pressable disabled={busy||!email.trim()||!password} onPress={()=>void login()} style={[ui.button,(busy||!email.trim()||!password)&&ui.disabled]}><Text style={ui.buttonText}>{busy?'VERIFYING...':'ENTER STAFF SCANNER'}</Text></Pressable><Text style={ui.muted}>Your venue owner manages invitations, gates and access. Existing staff credentials work here.</Text></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
