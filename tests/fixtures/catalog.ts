export const demoDrive = {
  id: "demo-drive",
  name: "Practice Placement Drive",
  date: "2026-12-01",
  venue: "Demonstration only — not a real event",
  status: "open",
  demo: 1,
};
export const demoCompanies = [
  {
    id: "demo-service",
    name: "Practice Customer Services",
    description: "Fictional employer for testing",
    demo: 1,
  },
  {
    id: "demo-retail",
    name: "Practice Retail Group",
    description: "Fictional employer for testing",
    demo: 1,
  },
  {
    id: "demo-tech",
    name: "Practice Technology Studio",
    description: "Fictional employer for testing",
    demo: 1,
  },
];
export const demoJobs = [
  {
    id: "demo-support",
    driveId: "demo-drive",
    companyId: "demo-service",
    title: "Customer Support Associate",
    description:
      "Assist customers by phone and email, explain services and maintain clear records. Training provided. Graduates from any discipline can explore this role.",
    skills: ["communication", "customer service", "english", "data entry"],
    qualification: 3,
    experience: 0,
    location: "Hyderabad",
    salary: "Not specified — demo",
    status: "open",
  },
  {
    id: "demo-retail-role",
    driveId: "demo-drive",
    companyId: "demo-retail",
    title: "Retail Sales Trainee",
    description:
      "Help shoppers, explain products, maintain shelves and learn basic billing. Freshers welcome. Candidate interest in customer-facing work matters.",
    skills: ["sales", "communication", "retail"],
    qualification: 1,
    experience: 0,
    location: "Hyderabad",
    salary: "Not specified — demo",
    status: "open",
  },
  {
    id: "demo-accounts",
    driveId: "demo-drive",
    companyId: "demo-service",
    title: "Accounts Assistant",
    description:
      "Maintain invoices, reconcile entries and prepare spreadsheets. Accounting experience is required.",
    skills: ["accounting", "tally", "excel"],
    qualification: 3,
    experience: 1,
    location: "Hyderabad",
    salary: "Not specified — demo",
    status: "open",
  },
  {
    id: "demo-python",
    driveId: "demo-drive",
    companyId: "demo-tech",
    title: "Junior Python Developer",
    description:
      "Build small web services, query relational databases and debug Python applications with a team.",
    skills: ["python", "sql", "web development"],
    qualification: 3,
    experience: 0,
    location: "Hyderabad",
    salary: "Not specified — demo",
    status: "open",
  },
];
export const demoProfile = {
  name: "Aarif Example",
  email: "aarif@example.com",
  phone: "9000000000",
  qualification: 3,
  experience: 0,
  skills: ["python", "sql", "machine learning"],
  summary:
    "Technology graduate with Python and SQL projects. Open to customer support and other fresher roles; willing to learn communication and service processes.",
};
