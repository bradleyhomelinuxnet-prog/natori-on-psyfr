function jdn(ay,m,d){const a=Math.floor((14-m)/12),y=ay+4800-a,mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;}
function jdToDate(J){J=Math.round(J);let a=J+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4);
  let d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
  let day=e-Math.floor((153*m+2)/5)+1,month=m+3-12*Math.floor(m/10),year=100*b+d-4800+Math.floor(m/10);
  return{year,month,day};}
const mod=(n,m)=>((n%m)+m)%m;
console.log("jdn(-2238,5,15) =", jdn(-2238,5,15), "(expect 903782)");
console.log("jdn(2026,8,25)  =", jdn(2026,8,25),  "(expect 2461278)");
console.log("jdn(2040,5,15)  =", jdn(2040,5,15),  "(expect 2466290)");
console.log("jdToDate(2466290) =", JSON.stringify(jdToDate(2466290)));
console.log("Y(GreatFlood->Today)  =", Math.abs(jdn(2026,8,25)-jdn(-2238,5,15)), "(expect 1557496)");
console.log("Y(GreatFlood->Phx2040)=", Math.abs(jdn(2040,5,15)-jdn(-2238,5,15)), "(expect 1562508)");
console.log("Y(Today->Phx2040)     =", Math.abs(jdn(2040,5,15)-jdn(2026,8,25)),  "(expect 5012)");
console.log("AM(2026)=",2026+3894,"LC(2026)=",2026+3112,"cat=",2026+5238);
console.log("phoenix node 2040?", mod(2040,138)===108, " mod=",mod(2040,138));
// X1+oph_round(Y/19)*19 with Y=1562508, base = Great Flood JD
const off=Math.round(1562508/19)*19; console.log("X1+oph_round(Y/19)*19 @Y=1562508 off=",off," ZJD=",903782+off, JSON.stringify(jdToDate(903782+off)));
const off2=Math.round(5012/19)*19; console.log("X1+oph_round(Y/19)*19 @Y=5012 off=",off2," ZJD=",2461278+off2, JSON.stringify(jdToDate(2461278+off2)));
const off3=5012*360/365.2422; console.log("X1+Y*360/365.2422 @Y=5012 off=",off3," ZJD=",Math.round(2461278+off3), JSON.stringify(jdToDate(Math.round(2461278+off3))));
