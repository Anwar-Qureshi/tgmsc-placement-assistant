export function phoneKey(value:string){const digits=value.replace(/\D/g,'');return digits.length===12&&digits.startsWith('91')?digits.slice(2):digits;}
export function contactKey(drive:string,name:string,email:string,phone:string){return drive+':'+(email?email.trim().toLowerCase():'phone:'+phoneKey(phone)+':'+name.trim().toLowerCase().replace(/\s+/g,' '));}
