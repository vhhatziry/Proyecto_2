const SimbolosEspeciales={FIN:0,ERROR:-2,OMITIR:1e4};class AnalizadorLexico{constructor(t="",i=null){this.token=-1,this.EdoActual=0,this.EdoTransicion=0,this.CadenaSigma=t,this.Lexema="",this.PasoPorEdoAcept=!1,this.IniLexema=0,this.FinLexema=-1,this.IndiceCaracterActual=0,this.CaracterActual="",this.Pila=[],this.matrizTransicionAFD=i}getEstadoAnalizadorLexico(){return{CaracterActual:this.CaracterActual,EdoActual:this.EdoActual,EdoTransicion:this.EdoTransicion,FinLexema:this.FinLexema,IndiceCaracterActual:this.IndiceCaracterActual,IniLexema:this.IniLexema,Lexema:this.Lexema,PasoPorEdoAcept:this.PasoPorEdoAcept,token:this.token,Pila:[...this.Pila]}}setEstadoAnalizadorLexico(t){return this.CaracterActual=t.CaracterActual,this.EdoActual=t.EdoActual,this.EdoTransicion=t.EdoTransicion,this.FinLexema=t.FinLexema,this.IndiceCaracterActual=t.IndiceCaracterActual,this.IniLexema=t.IniLexema,this.Lexema=t.Lexema,this.PasoPorEdoAcept=t.PasoPorEdoAcept,this.token=t.token,this.Pila=[...t.Pila],!0}setSigma(t){this.CadenaSigma=t,this.PasoPorEdoAcept=!1,this.IniLexema=0,this.FinLexema=-1,this.IndiceCaracterActual=0,this.token=-1,this.Pila=[]}getLexema(){return this.Lexema}getIndiceCaracterActual(){return this.IndiceCaracterActual}cadenaXAnalizar(){return this.CadenaSigma.substring(this.IndiceCaracterActual)}getEstadoActual(){return this.EdoActual}getTamSigma(){return this.CadenaSigma.length}getIniLexema(){return this.IniLexema}getLongLexema(){return this.Lexema.length}yylex(){for(;;){if(this.Pila.push(this.IndiceCaracterActual),this.IndiceCaracterActual>=this.CadenaSigma.length)return this.Lexema="",SimbolosEspeciales.FIN;for(this.IniLexema=this.IndiceCaracterActual,this.EdoActual=0,this.PasoPorEdoAcept=!1,this.FinLexema=-1,this.token=-1;this.IndiceCaracterActual<this.CadenaSigma.length;){this.CaracterActual=this.CadenaSigma[this.IndiceCaracterActual];const t=this.CadenaSigma.charCodeAt(this.IndiceCaracterActual)+1;if(-1===this.matrizTransicionAFD[this.EdoActual][t]||void 0===this.matrizTransicionAFD[this.EdoActual][t])break;{this.EdoTransicion=this.matrizTransicionAFD[this.EdoActual][t];const i=257;-1!==this.matrizTransicionAFD[this.EdoTransicion][i]&&void 0!==this.matrizTransicionAFD[this.EdoTransicion][i]&&(this.PasoPorEdoAcept=!0,this.token=this.matrizTransicionAFD[this.EdoTransicion][i],this.FinLexema=this.IndiceCaracterActual),this.IndiceCaracterActual++,this.EdoActual=this.EdoTransicion}}if(!this.PasoPorEdoAcept)return this.IndiceCaracterActual=this.IniLexema+1,this.Lexema=this.CadenaSigma.substring(this.IniLexema,this.IndiceCaracterActual),this.token=SimbolosEspeciales.ERROR,this.token;if(this.Lexema=this.CadenaSigma.substring(this.IniLexema,this.FinLexema+1),this.IndiceCaracterActual=this.FinLexema+1,this.token!==SimbolosEspeciales.OMITIR)return this.token}}undoToken(){return 0!==this.Pila.length&&(this.IndiceCaracterActual=this.Pila.pop(),!0)}}export{AnalizadorLexico,SimbolosEspeciales};