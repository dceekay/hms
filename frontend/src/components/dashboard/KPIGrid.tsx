import StatCard from "./StatCard";

export default function KPIGrid(){

const stats=[

{
title:"Patients",
value:"1,284",
icon:"🧑",
change:"+12%"
},

{
title:"Appointments",
value:"248",
icon:"📅",
change:"+8%"
},

{
title:"Revenue",
value:"₦18.4M",
icon:"💰",
change:"+23%"
},

{
title:"Doctors",
value:"54",
icon:"👨‍⚕️",
change:"+2"
}

];

return(

<div className="stats-grid">

{stats.map((s)=>

<StatCard

key={s.title}

{...s}

/>

)}

</div>

);

}