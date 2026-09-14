import {StyleSheet} from 'react-native';
export const c={bg:'#080908',panel:'#15150f',gold:'#dfcfa3',muted:'#a9a99f',white:'#faf7ef',line:'#484130',green:'#71ecc0',red:'#ff9292',amber:'#ffcf79'};
export const ui=StyleSheet.create({
 page:{flex:1,backgroundColor:c.bg},center:{flex:1,justifyContent:'center',padding:28,gap:18},
 label:{fontSize:11,fontWeight:'700',letterSpacing:2,color:c.gold},title:{fontSize:32,fontWeight:'800',color:c.white,letterSpacing:-1},text:{fontSize:14,color:c.white},muted:{fontSize:12,lineHeight:19,color:c.muted},
 input:{backgroundColor:'#0c0d0b',borderWidth:1,borderColor:c.line,color:c.white,borderRadius:6,padding:15,fontSize:16},
 button:{backgroundColor:c.gold,borderRadius:6,padding:15,minHeight:48,alignItems:'center',justifyContent:'center'},buttonText:{color:c.bg,fontSize:12,fontWeight:'800',letterSpacing:1},
 secondary:{borderWidth:1,borderColor:c.line,backgroundColor:c.panel,borderRadius:6,padding:13,minHeight:44,alignItems:'center',justifyContent:'center'},secondaryText:{color:c.gold,fontWeight:'700',fontSize:12},
 row:{flexDirection:'row',alignItems:'center',gap:10},panel:{padding:18,borderWidth:1,borderColor:c.line,borderRadius:10,backgroundColor:c.panel,gap:10},error:{color:c.red,fontSize:13,lineHeight:20},disabled:{opacity:.4}
});
