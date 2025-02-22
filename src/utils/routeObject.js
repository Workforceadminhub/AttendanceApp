import { ADMIN_ENUMS } from "./adminEnums";

export const routeObject = [
  { department: "Workforce Admin", route: "/wadata", team: "Ministry" },
  { department: "Ministry team leadership", route: "/subheadsmin", team: "Ministry" },
  { department: "Leadership Effectiveness", route: "/leadeff", team: "Ministry" },
  { department: "Leadership Recruitment", route: "/lrecruit", team: "Ministry" },
  { department: "Leadership Training", route: "/leadtr", team: "Ministry" },
  { department: "Pastoral Care", route: "/pascares", team: "Ministry" },
  { department: "Discipleship, Bible Study and Prayer", route: "/dbsp", team: "Ministry" },
  { department: "Call Centre", route: "/mincc", team: "Ministry" },
  { department: "Recruitment and Assimilation", route: "/rcam", team: "Ministry" },
  { department: "Career and Finance", route: "/crfn", team: "Ministry" },
  { department: "Medical Ministry", route: "/mdmn", team: "Ministry" },
  { department: "Elders Care", route: "/edc", team: "Ministry" },
  { department: "Prison Ministry", route: "/prm", team: "Ministry" },
  { department: "Kids Support", route: "/kds", team: "Ministry" },
  { department: "House of Dorcas", route: "/hod", team: "Ministry" },
  { department: "Legal Aid", route: "/lea", team: "Ministry" },
  { department: "Benevolence", route: "/benevolence", team: "Membership" },
  { department: "Call Center", route: "/callcenter", team: "Membership" },
  { department: "Celebration", route: "/celebration", team: "Membership" },
  { department: "Ceremonies", route: "/ceremonies", team: "Membership" },
  { department: "Data Management", route: "/datamgt", team: "Membership" },
  { department: "Growth Track", route: "/growthtrack", team: "Membership" },
  { department: "Guest Welcome", route: "/guestwelcome", team: "Membership" },
  { department: "Info Hub", route: "/infohub", team: "Membership" },
  { department: "Interactors", route: "/interactor", team: "Membership" },
  { department: "New Convert", route: "/newconvert", team: "Membership" },
  { department: "Weddings", route: "/weddings", team: "Membership" },
  { department: "Admin and Facility", route: "/adminfacility", team: "General Service" },
  { department: "Communications (DMU)", route: "/dmu", team: "General Service" },
  { department: "Finance", route: "/finance", team: "General Service" },
  { department: "Singles Ministry", route: "/singles", team: "Interactive Groups" },
  { department: "Women of Wisdom", route: "/wow", team: "Interactive Groups" },
  { department: "Men of Harvest", route: "/moh", team: "Interactive Groups" },
  { department: "Discipleship Event", route: "/discipleevent", team: "Maturity" },
  { department: "Group Partnership", route: "/grouppartner", team: "Maturity" },
  { department: "Testimony Capture", route: "/testimony", team: "Maturity" },
  { department: "Courses HSDC", route: "/courses", team: "Maturity" },
  { department: "Content Development (Resources)", route: "/contentdev", team: "Maturity" },
  { department: "Prayer and Bible Study", route: "/prayerbible", team: "Maturity" },
  { department: "Evangelism", route: "/evangelism", team: "Mission" },
  { department: "God's encounter", route: "/godencounter", team: "Mission" },
  { department: "HSAP", route: "/hsap", team: "Mission" },
  { department: "Invest and Invite", route: "/investinvite", team: "Mission" },
  { department: "NLP", route: "/nlp", team: "Mission" },
  { department: "Publicity", route: "/publicity", team: "Mission" },
  { department: "Royal Priesthoods Community", route: "/royalpriesthood", team: "Districts" },
  { department: "Ogudu/Alapere Community", route: "/ogudualapere", team: "Districts" },
  { department: "Bethel Community", route: "/bethel", team: "Districts" },
  { department: "Harmony Community", route: "/harmony", team: "Districts" },
  { department: "Shomolu 2 Community", route: "/shomolu2", team: "Districts" },
  { department: "Lightbearers Community", route: "/lightbearers", team: "Districts" },
  { department: "Trailblazer Community", route: "/trailblazer", team: "Districts" },
  { department: "Praise (Couple) Community", route: "/praise", team: "Districts" },
  { department: "Gbagada Estate Community", route: "/gbagadaestate", team: "Districts" },
  { department: "Sapphire ET", route: "/sapphire", team: "Programs" },
  { department: "Musicians", route: "/musicians", team: "Programs" },
  { department: "Diamond ET", route: "/diamont", team: "Programs" },
  { department: "Emerald ET", route: "/emerald", team: "Programs" },
  { department: "Pearl ET", route: "/pearl", team: "Programs" },
  { department: "Greeters 1st team", route: "/greeters1", team: "Programs" },
  { department: "Greeters 2nd team", route: "/greeters2", team: "Programs" },
  { department: "Greeters 3rd team", route: "/greeters3", team: "Programs" },
  { department: "Greeters 4th team", route: "/greeters4", team: "Programs" },
  { department: "Harvesters Intelligence Unit", route: "/hiu", team: "Programs" },
  { department: "Media-Administration", route: "/mediaadmin", team: "Programs" },
  { department: "Media-Experience", route: "/mexperience", team: "Programs" },
  { department: "Media-Graphics", route: "/mgraphics", team: "Programs" },
  { department: "Media-Light", route: "/mlight", team: "Programs" },
  { department: "Media-Livestream", route: "/mlivestream", team: "Programs" },
  { department: "Media-Photo (Capturing)", route: "/mphoto", team: "Programs" },
  { department: "Media-Text & Timing", route: "/mtext", team: "Programs" },
  { department: "Media-Video", route: "/mvideo", team: "Programs" },
  { department: "Media-Visuals", route: "/mvisuals", team: "Programs" },
  { department: "Media-Audio Production", route: "/maudio", team: "Programs" },
  { department: "Media-Equipment Management", route: "/mequipment", team: "Programs" },
  { department: "Program Management", route: "/programmgt", team: "Programs" },
  { department: "Protocol", route: "/protocol", team: "Programs" },
  { department: "Sound", route: "/sound", team: "Programs" },
  { department: "Quality Assurance", route: "/qa", team: "Programs" },
  { department: "Unveil", route: "/unveildance", team: "Programs" },
  { department: "Traffic", route: "/traffic", team: "Programs" },
  { department: "Ushering - Bimpe", route: "/usheringbimpe", team: "Programs" },
  { department: "Ushering - Queen", route: "/usheringqueen", team: "Programs" },
  { department: "Ushering - Iyaanu", route: "/usheringiyanu", team: "Programs" },
  { department: "Ushering - Tosin", route: "/usheringtosin", team: "Programs" },
  { department: "Ushering - Kofoworola", route: "/usheringkofo", team: "Programs" },
  { department: "Venue Management", route: "/venuemgt", team: "Programs" },
  { department: "Programs Admin Team", route: "/programsadminteam", team: "Programs" },
  { department: "Sub team-Missions", route: "/subtmission", team: "Mission" },
  { department: "Anagkazo Community", route: "/anagkazo", team: "Districts" },
  { department: "Sunrise Community", route: "/sunrise", team: "Districts" },
  { department: "Target Missions", route: "/targetmissions", team: "Mission" },
  { department: "Reach and Partnership - Stirhouse", route: "/rpstirhouse", team: "Next Gen" },
  { department: "Learning and Development - Stirhouse", route: "/ldstirhouse", team: "Next Gen" },
  { department: "Programming and Environment - Stirhouse", route: "/pestirhouse", team: "Next Gen" },
  { department: "Administration - Stirhouse", route: "/adminstirhouse", team: "Next Gen" },
  { department: "Reach and Partnership - Kidszone", route: "/rpkidszone", team: "Next Gen" },
  { department: "New Workers - Kidszone", route: "/nwkidszone", team: "Next Gen" },
  { department: "Administration - Kidszone", route: "/adminkidszone", team: "Next Gen" },
  { department: "Programming and Environment - Kidszone", route: "/progkidszone", team: "Next Gen" },
  { department: "Learning and Development - Kidszone", route: "/learnkidszone", team: "Next Gen" },
  { department: "Venue Management - Zeina team", route: "/vmgtzeina", team: "Programs" },
  { department: "Venue Management - Tosin Agbetuyi team", route: "/vmgttosin", team: "Programs" },
  { department: "Venue Management - Emmanuel team", route: "/vmgtemma", team: "Programs" },
  { department: "Venue Management - Boluwatife team", route: "/vmgtbolu", team: "Programs" },
  { department: "Venue Management - Feyisayo Phillip team", route: "/vmgtfeyi", team: "Programs" },
];

export const attendanceRoutes = routeObject.map(
  (item) => `/attendance${item.route}`
);
export const summaryRoutes = routeObject.map((item) => `/summary${item.route}`);
export const dashboardRoutes = routeObject.map(
  (item) => `/dashboard${item.route}`
);

const specialDepartmentsFromTeam = Array.from(
  new Set(routeObject.map((item) => item.team))
);

export const specialDepartments = [
  ...specialDepartmentsFromTeam,
  ADMIN_ENUMS.ADMIN_DEPARTMENT,
];
export const adminRoutes = Array.from(
  new Set(
    routeObject.map(
      (item) => `admin/${item.team.toLowerCase().trim().replaceAll(" ", "")}`
    )
  )
);
export const historyRoutes = Array.from(
  new Set(
    routeObject.map(
      (item) => `history/admin/${item.team.toLowerCase().trim().replaceAll(" ", "")}`
    )
  )
);

export const getAdminSelectOptions = (isChurchAdmin, team) => {
  const options = isChurchAdmin
    ? Array.from(new Set(routeObject.map((item) => item.team))).map((team) => ({
        value: team,
        label: team,
      }))
    : routeObject
        .filter((item) => item.team === team.department)
        .map((item) => ({ value: item.department, label: item.department }));

  return options;
};
