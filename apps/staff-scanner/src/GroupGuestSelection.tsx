import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {c} from './theme';

export default function GroupGuestSelection({purchased,entered,disabled,onChange}:{purchased:number;entered:number;disabled:boolean;onChange:(quantity:number)=>void}){
 const [selected,setSelected]=useState<number[]>(entered<purchased?[entered]:[]);
 return <View style={{gap:8}}>
  <Text style={{color:c.white}}>Select guests entering now</Text>
  <Text style={{color:c.muted,fontSize:11}}>Admission slots, not named guests. Entered slots are locked.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {Array.from({length:purchased},(_,index)=>{
    const used=index<entered,checked=used||selected.includes(index);
    return <Pressable key={index} accessibilityRole="checkbox" accessibilityLabel={`Guest ${index+1}${used?', already entered':''}`} accessibilityState={{checked,disabled:disabled||used}} disabled={disabled||used}
     onPress={()=>{const next=selected.includes(index)?selected.filter(value=>value!==index):[...selected,index];setSelected(next);onChange(next.length);}}
     style={{minHeight:48,minWidth:110,padding:12,borderWidth:1,borderColor:used?c.line:c.gold,opacity:used?.55:1,justifyContent:'center'}}>
     <Text style={{color:used?c.muted:c.gold}}>{checked?'[x]':'[ ]'} Guest {index+1}{used?' · Entered':''}</Text>
    </Pressable>;
   })}
  </View>
 </View>;
}
