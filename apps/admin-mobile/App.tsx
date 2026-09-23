import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,FlatList,Modal,Platform,Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import {AccessError,configured,db,Detail,money,Report,rpc,Stats,time} from './src/api';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
const tabs=['pending','approved','rejected','expired'] as const;
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.secondary,disabled&&{opacity:.4}]}><Text style={[s.buttonText,secondary&&{color:'#ddcea4'}]}>{title}</Text></Pressable>;}
function Line({label,value}:{label:string;value:unknown}){return <View style={s.line}><Text style={s.muted}>{label}</Text><Text selectable style={s.text}>{String(value??'Not recorded')}</Text></View>;}
export default function App(){
 const [ready,setReady]=useState(false),[signed,setSigned]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[foreground,setForeground]=useState(true);
 const [tab,setTab]=useState<typeof tabs[number]>('pending'),[page,setPage]=useState(0),[report,setReport]=useState<Report|null>(null),[stats,setStats]=useState<Stats|null>(null);
 const [selected,setSelected]=useState<string|null>(null),[detail,setDetail]=useState<Detail|null>(null),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[notice,setNotice]=useState('');
 const [pushStatus,setPushStatus]=useState('Enable payment alerts'),[refresh,setRefresh]=useState(0);
 const sequence=useRef(0),lock=useRef(false),pushToken=useRef<string|null>(null),active=useRef(true);
 const clear=()=>{sequence.current++;setReport(null);setStats(null);setDetail(null);setSelected(null);setSigned(false);};
 const fail=(e:unknown)=>{if(e instanceof AccessError){clear();void db.auth.signOut({scope:'local'});}setError(e instanceof Error?e.message:'Connection lost. Refresh before retrying.');};
 useEffect(()=>{
  let mounted=true;
  db.auth.getSession().then(async({data,error:sessionError})=>{if(sessionError)throw sessionError;if(data.session){await rpc('mobile_admin_dashboard');if(mounted)setSigned(true);}}).catch(e=>{if(mounted)fail(e);}).finally(()=>{if(mounted)setReady(true);});
  const {data:{subscription}}=db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&mounted)clear();});
  const app=AppState.addEventListener('change',state=>{active.current=state==='active';setForeground(active.current);if(active.current){db.auth.startAutoRefresh();setRefresh(n=>n+1);}else{db.auth.stopAutoRefresh();sequence.current++;setDetail(null);setReport(null);setStats(null);}});
  const receive=Notifications.addNotificationReceivedListener(()=>setRefresh(n=>n+1));
  const response=Notifications.addNotificationResponseReceivedListener(()=>{setTab('pending');setPage(0);setRefresh(n=>n+1);});
  return()=>{mounted=false;subscription.unsubscribe();app.remove();receive.remove();response.remove();};
 },[]);
 useEffect(()=>{if(!signed||!foreground)return;const t=setInterval(()=>setRefresh(n=>n+1),20000);return()=>clearInterval(t);},[signed,foreground]);
 useEffect(()=>{
  if(!signed||!foreground)return;
  const seq=++sequence.current;setLoading(true);setError('');
  Promise.all([rpc<Stats>('mobile_admin_dashboard'),rpc<Report>('admin_upi_search',{filters:{status:tab,sort:tab==='pending'?'expiring':'newest',range:'ALL',page,size:25}}),selected?rpc<Detail>('admin_upi_details',{target_order:selected}):Promise.resolve(null)])
  .then(([nextStats,nextReport,nextDetail])=>{if(seq!==sequence.current)return;setStats(nextStats);setReport(nextReport);setDetail(nextDetail);})
  .catch(e=>{if(seq===sequence.current){setDetail(null);setReport(null);fail(e);}}).finally(()=>{if(seq===sequence.current)setLoading(false);});
  return()=>{sequence.current++;};
 },[signed,foreground,tab,page,selected,refresh]);
 async function login(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
  if(!configured)throw new Error('Configure the public Supabase environment before signing in.');
  const loginEmail=email.trim().replace(/^mailto:/i,'').split('?')[0].trim();
  setEmail(loginEmail);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail))throw new Error('Enter your email address, for example name@example.com.');
  const {error:err}=await db.auth.signInWithPassword({email:loginEmail,password});if(err)throw new Error('Sign-in failed. Check your admin credentials.');
  await rpc('mobile_admin_start');await rpc('mobile_admin_dashboard');setPassword('');setSigned(true);
 }catch(e){await db.auth.signOut({scope:'local'});fail(e);}finally{lock.current=false;setBusy(false);}}
 async function logout(){if(lock.current)return;lock.current=true;setBusy(true);try{await rpc('end_portal_session');await db.auth.signOut({scope:'local'});pushToken.current=null;clear();}catch(e){fail(e);}finally{lock.current=false;setBusy(false);}}
 async function enablePush(){try{
  const projectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;if(!projectId||projectId.includes('YOUR_'))throw new Error('Push setup requires your EAS project and platform credentials.');
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('payments',{name:'Payment approvals',importance:Notifications.AndroidImportance.HIGH});
  let permission=await Notifications.getPermissionsAsync();if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();if(permission.status!=='granted')throw new Error('Notifications are disabled. Enable them in phone settings.');
  const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;await rpc('mobile_admin_push',{push_token:token,enabled:true});pushToken.current=token;setPushStatus('Payment alerts enabled');
 }catch(e){fail(e);}}
 async function review(approve:boolean){
  if(lock.current||!selected||!detail||detail.state!=='PENDING'||!active.current)return;
  if(approve&&!confirmed)return;if(!approve&&note.trim().length<3){setError('Enter a rejection reason (at least 3 characters).');return;}
  lock.current=true;setBusy(true);setError('');
  try{await rpc('review_manual_upi',{target_order:selected,approve,note:note.trim()||'Payment manually approved. No additional review note provided.'});setNotice(approve?'Payment verified. Pass issuance completed by ARS.':'Payment rejected. Reservation released by ARS.');setConfirmed(false);setNote('');}
  catch(e){fail(e);setNotice('Refresh the payment before retrying. A network failure does not prove the action failed.');}
  finally{lock.current=false;setBusy(false);setDetail(null);setRefresh(n=>n+1);}
 }
 const choose=(id:string)=>{setDetail(null);setSelected(id);setNote('');setConfirmed(false);setNotice('');};
 const confirm=(approve:boolean)=>Alert.alert(approve?'Approve payment?':'Reject payment?',approve?'Confirm you matched the exact amount and UTR in the receiving account. ARS will issue the pass.':'This releases the inventory hold. The rejection reason will be recorded.',[{text:'Cancel',style:'cancel'},{text:approve?'Approve & issue pass':'Reject payment',style:approve?'default':'destructive',onPress:()=>void review(approve)}]);
 return <SafeAreaProvider><SafeAreaView style={s.screen}><StatusBar style="light"/>{!foreground?<View style={s.center}><Text style={s.brand}>ARS ADMIN</Text></View>:!ready?<ActivityIndicator color="#d2bd84" style={s.center}/>:!signed?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.login}><Text style={s.brand}>ARS / PRIVATE OPERATIONS</Text><Text style={s.title}>Your command centre.</Text><Text style={s.muted}>Secure admin access. Signing in replaces your previous admin session.</Text><TextInput accessibilityLabel="Admin email" style={s.input} placeholder="Admin email" placeholderTextColor="#99958b" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail}/><TextInput accessibilityLabel="Password" style={s.input} placeholder="Password" placeholderTextColor="#99958b" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword}/>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button title={busy?'Signing in...':'Sign in'} disabled={busy||!email||!password} onPress={()=>void login()}/></ScrollView>:<>
 <View style={s.header}><View><Text style={s.brand}>ARS ADMIN</Text><Text style={s.muted}>Payment operations</Text></View><Button title="Sign out" secondary disabled={busy} onPress={()=>Alert.alert('Sign out?','End this admin session?',[{text:'Cancel',style:'cancel'},{text:'Sign out',onPress:()=>void logout()}])}/></View>
 <FlatList data={report?.rows||[]} keyExtractor={row=>row.id} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>setRefresh(n=>n+1)} tintColor="#d2bd84"/>} ListHeaderComponent={<>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 <View style={s.metrics}>{[['Pending approvals',stats?.pending],['Pending amount',stats?money(stats.pendingAmount):undefined],['Approved today',stats?.approved],['Rejected today',stats?.rejected],['Tickets issued today',stats?.tickets]].map(([label,value])=><View key={label} style={s.metric}><Text style={s.muted}>{label}</Text><Text style={s.number}>{value??'--'}</Text></View>)}</View>
 <Text style={s.caption}>Today uses IST. Tickets count issued guest entries, not group QR codes.</Text><Button title={pushStatus} secondary onPress={()=>void enablePush()}/>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>{tabs.map(t=><Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:tab===t}} onPress={()=>{setTab(t);setPage(0);setReport(null);}} style={[s.tab,tab===t&&s.selected]}><Text style={s.text}>{t==='pending'?'Pending approval':t[0].toUpperCase()+t.slice(1)}</Text></Pressable>)}</ScrollView>
 <Text style={s.caption}>{tab==='pending'?'Closest to hold expiry first':'Payment history'} · {report?.total??'--'} payments</Text>
 </>} renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>choose(item.id)} style={s.payment}><View style={s.row}><Text style={s.name}>{item.customer_name}</Text><Text style={s.amount}>{money(item.total)}</Text></View><Text style={s.text}>{item.event_name}</Text><Text style={s.muted}>{item.venue_name}</Text><Text style={s.code}>UTR {item.utr}</Text><Text style={s.caption}>Submitted {time(item.submitted_at)} IST</Text>{tab==='pending'?<Text style={s.gold}>Hold ends {time(item.expires_at)} IST</Text>:<Text style={s.caption}>{item.state} · {item.reviewer_name||'System'} · {time(item.reviewed_at)}</Text>}</Pressable>} ListEmptyComponent={<Text style={s.muted}>{loading?'Loading payments...':error?'Payments unavailable. Pull down to retry.':'No payments in this queue.'}</Text>} ListFooterComponent={<View style={s.row}><Button title="Previous" secondary disabled={page===0||loading} onPress={()=>setPage(p=>p-1)}/><Text style={s.text}>Page {page+1}</Text><Button title="Next" secondary disabled={loading||!report||(page+1)*25>=report.total} onPress={()=>setPage(p=>p+1)}/></View>}/>
 <Modal visible={!!selected} animationType="slide" onRequestClose={()=>{if(!busy)setSelected(null);}}><SafeAreaView style={s.screen}><View style={s.header}><Text style={s.brand}>PAYMENT DETAILS</Text><Button title="Close" secondary disabled={busy} onPress={()=>setSelected(null)}/></View><ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">{!!error&&<Text style={s.error}>{error}</Text>}{!!notice&&<Text style={s.gold}>{notice}</Text>}{!detail?<><ActivityIndicator color="#d2bd84"/><Button title="Refresh payment" secondary onPress={()=>setRefresh(n=>n+1)}/></>:<>
 <Text style={s.title}>{detail.state==='VERIFIED'?'Payment verified':detail.state}</Text>
 {Object.entries(detail.order).map(([key,value])=><Line key={key} label={key.replace(/_/g,' ')} value={value}/>)}
 <Text style={s.brand}>PAYMENT / VERIFICATION</Text>{Object.entries(detail.payment).map(([key,value])=><Line key={key} label={key.replace(/_/g,' ')} value={value}/>)}
 {detail.state==='PENDING'&&<View style={s.review}><Text style={s.gold}>Match the amount and UTR in your bank account. A submitted UTR is not proof of payment.</Text><TextInput style={[s.input,{minHeight:80}]} accessibilityLabel="Review note" placeholder="Optional approval note / required rejection reason" placeholderTextColor="#99958b" multiline maxLength={1000} value={note} onChangeText={setNote}/><Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed}} onPress={()=>setConfirmed(!confirmed)} style={s.tab}><Text style={s.text}>{confirmed?'[x]':'[ ]'} I verified the exact amount and UTR in the receiving account.</Text></Pressable><Button title={busy?'Confirming...':'Approve & issue pass'} disabled={busy||!confirmed||(note.trim().length>0&&note.trim().length<3)} onPress={()=>confirm(true)}/><Button title="Reject payment" secondary disabled={busy||note.trim().length<3} onPress={()=>confirm(false)}/></View>}
 <Text style={s.brand}>ISSUED GUEST ENTRIES · {detail.tickets.length}</Text>{detail.tickets.length===0&&<Text style={s.muted}>No tickets issued.</Text>}{detail.tickets.map(ticket=><View key={ticket.id} style={s.payment}><Text selectable style={s.text}>{ticket.id}</Text><Text style={s.muted}>{ticket.customer_name} · {ticket.ticket_type} · {ticket.status}</Text></View>)}
 <Text style={s.brand}>AUDIT HISTORY</Text>{detail.audit.map(a=><View key={a.id} style={s.line}><Text style={s.gold}>{a.action}</Text><Text style={s.muted}>{a.actor_name||'System'} · {time(a.created_at)} IST</Text></View>)}
 </>}</ScrollView></SafeAreaView></Modal>
 </>}</SafeAreaView></SafeAreaProvider>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#0b0c09'},center:{flex:1,alignItems:'center',justifyContent:'center'},login:{padding:26,paddingTop:80,gap:20},header:{padding:16,borderBottomWidth:1,borderColor:'#353329',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{color:'#d2bd84',fontSize:13,fontWeight:'700',letterSpacing:2,marginVertical:8},title:{color:'#eee9dc',fontSize:30,marginVertical:14,fontFamily:Platform.OS==='ios'?'Georgia':'serif'},text:{color:'#eee9dc',fontSize:15,lineHeight:23},muted:{color:'#aaa79e',fontSize:14,lineHeight:21},caption:{color:'#aaa79e',fontSize:12,lineHeight:19,marginVertical:6},gold:{color:'#d2bd84',fontSize:14,lineHeight:22},error:{color:'#ffac9e',padding:14,backgroundColor:'#311b17',marginVertical:10},input:{borderWidth:1,borderColor:'#484437',color:'#eee9dc',padding:15,fontSize:16,backgroundColor:'#13140f',marginVertical:8},button:{backgroundColor:'#d2bd84',paddingHorizontal:16,minHeight:48,justifyContent:'center',alignItems:'center',marginVertical:5},secondary:{backgroundColor:'#171812',borderWidth:1,borderColor:'#484437'},buttonText:{fontSize:14,fontWeight:'700',color:'#11130e'},list:{padding:16,paddingBottom:40,gap:12},metrics:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{width:'47%',padding:14,backgroundColor:'#171812',borderTopWidth:1,borderColor:'#484437'},number:{color:'#eee9dc',fontSize:23,fontWeight:'600',marginTop:8},tabs:{marginVertical:14},tab:{minHeight:48,padding:14,borderBottomWidth:2,borderColor:'transparent'},selected:{borderColor:'#d2bd84',backgroundColor:'#201f17'},payment:{padding:16,borderWidth:1,borderColor:'#353329',gap:6},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},name:{color:'#eee9dc',fontSize:17,fontWeight:'600',flex:1},amount:{color:'#d2bd84',fontSize:16,fontWeight:'600'},code:{color:'#ddd7c8',fontSize:14,marginTop:7},line:{paddingVertical:10,borderBottomWidth:1,borderColor:'#28291f',gap:5},review:{padding:14,borderWidth:1,borderColor:'#796a44',marginVertical:16,gap:10}});
