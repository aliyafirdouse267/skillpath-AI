import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(root, '.env'));
const port = Number(process.env.PORT || 8000);
const storeFile = resolve(root, process.env.DATA_FILE || './data/demo-store.json');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const careers = {
  'Data Scientist':['Python Fundamentals','Data Structures','NumPy & Pandas','Statistics','Data Visualization','Machine Learning','Portfolio Projects'],
  'Data Analyst':['Spreadsheet & Data Basics','SQL Fundamentals','Data Cleaning with Python','Statistics','Data Visualization','Business Insights','Portfolio Projects'],
  'Software Developer':['Programming Fundamentals','Data Structures','Object-Oriented Programming','Git & Collaboration','APIs and Databases','Testing','Portfolio Projects'],
  'Web Developer':['HTML & CSS','JavaScript Fundamentals','Responsive Design','Frontend Frameworks','APIs','Git & Deployment','Portfolio Projects'],
  'Machine Learning Engineer':['Python Fundamentals','Data Structures','NumPy & Pandas','Statistics','Machine Learning','Model Deployment','Portfolio Projects'],
  'Python Developer':['Python Fundamentals','Control Flow & Functions','Data Structures','Object-Oriented Programming','Files & APIs','Testing','Portfolio Projects'],
  'Java Developer':['Java Fundamentals','Object-Oriented Programming','Collections & Generics','SQL & Persistence','APIs','Testing','Portfolio Projects']
};
const questions = [
  { prompt:'Which Python type is best for storing an ordered, changeable collection?', options:['tuple','list','set'], answer:1, skill:'Programming fundamentals' },
  { prompt:'What does a function help you do?', options:['Reuse a named block of code','Store only text','Stop a program permanently'], answer:0, skill:'Problem solving' },
  { prompt:'Which keyword starts a conditional branch in Python?', options:['when','if','case'], answer:1, skill:'Programming fundamentals' },
  { prompt:'What is the result of len([2, 4, 6])?', options:['2','3','6'], answer:1, skill:'Data handling' },
  { prompt:'Which structure stores key-value pairs?', options:['dictionary','string','integer'], answer:0, skill:'Data handling' }
];
const sampleJobs = [
  { id:'analyst-01', title:'Junior Data Analyst', company:'Northstar Insights', skills:['SQL','Python','Data visualization'], match:88, why:'Your assessment evidence and roadmap overlap with core analyst skills.' },
  { id:'engineer-01', title:'Graduate Software Engineer', company:'BrightWorks', skills:['Programming','Git','Problem solving'], match:82, why:'Your programming assessment and project-focused roadmap fit this entry-level role.' },
  { id:'scientist-01', title:'Associate Data Scientist', company:'OpenField Labs', skills:['Python','Statistics','Machine learning'], match:74, why:'Your Python foundation is relevant; statistics and machine learning are useful next goals.' }
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of requireText(path).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
function requireText(path) { return readFileSync(path, 'utf8'); }

async function getStore() {
  try { return JSON.parse(await readFile(storeFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return { profiles:{}, progress:{}, assessments:[], resumes:{} }; }
}
async function putStore(store) {
  await mkdir(dirname(storeFile), { recursive:true });
  await writeFile(storeFile, JSON.stringify(store, null, 2), 'utf8');
}
function send(res, status, data) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let raw='';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw Object.assign(new Error('Request body too large'), { status:413 }); }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Request body must be valid JSON'), { status:400 }); }
}
function getRoadmap(level, career) {
  const topics = careers[career] || [`${career} Fundamentals`, 'Core Concepts', 'Tools & Practice', 'Applied Projects', 'Portfolio Projects'];
  return level === 'Know the Basics' ? topics.slice(1) : topics;
}
function cleanString(value, max=120) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res,200,{ status:'ok', mode:'demo', persistence:'local-json' });
  if (req.method === 'POST' && url.pathname === '/api/onboarding') {
    const data=await body(req); const level=cleanString(data.level,40); const career=cleanString(data.career,80);
    if (!['Beginner','Know the Basics'].includes(level) || career.length < 2) return send(res,400,{ error:'Choose a supported level and enter a career.' });
    const store=await getStore(); const profile={ level, career, createdAt:new Date().toISOString() }; store.profiles.default=profile; store.progress.default=[];
    await putStore(store); return send(res,201,{ profile, roadmap:getRoadmap(level,career) });
  }
  if (req.method === 'GET' && url.pathname === '/api/roadmap') {
    const level=cleanString(url.searchParams.get('level'),40), career=cleanString(url.searchParams.get('career'),80);
    if (!level || !career) return send(res,400,{ error:'Level and career query parameters are required.' });
    const store=await getStore(); return send(res,200,{ topics:getRoadmap(level,career), completed:store.progress.default || [] });
  }
  if (req.method === 'POST' && url.pathname === '/api/progress') {
    const data=await body(req); const topic=cleanString(data.topic,120);
    if (!topic) return send(res,400,{ error:'A topic is required.' });
    const store=await getStore(); store.progress.default ??= [];
    if (!store.progress.default.includes(topic)) store.progress.default.push(topic);
    await putStore(store); return send(res,200,{ completed:store.progress.default });
  }
  if (req.method === 'POST' && url.pathname === '/api/assessment') {
    const data=await body(req); if (!Array.isArray(data.answers) || data.answers.length !== questions.length) return send(res,400,{ error:`Submit exactly ${questions.length} answers.` });
    const answers=data.answers.map(Number); if (answers.some((n,i)=>!Number.isInteger(n)||n<0||n>=questions[i].options.length)) return send(res,400,{ error:'One or more answers are invalid.' });
    const correct=answers.reduce((sum,n,i)=>sum+(n===questions[i].answer?1:0),0); const score=Math.round(correct/questions.length*100);
    const result={ score, correct, total:questions.length, skills:Object.fromEntries(['Programming fundamentals','Problem solving','Data handling'].map(skill=>{const qs=questions.map((q,i)=>({q,i})).filter(x=>x.q.skill===skill);return [skill,Math.round(qs.filter(x=>answers[x.i]===x.q.answer).length/qs.length*100)]})), nextAction:score>=80?'Continue to applied projects.':score>=60?'Review missed topics and reassess.':'Revisit the fundamentals notes before trying again.' };
    const store=await getStore(); store.assessments.unshift({ ...result, createdAt:new Date().toISOString() }); await putStore(store); return send(res,200,result);
  }
  if ((req.method==='GET'||req.method==='PUT') && url.pathname==='/api/resume') {
    const store=await getStore();
    if(req.method==='GET') return send(res,200,store.resumes.default||{});
    const data=await body(req); const resume={ name:cleanString(data.name,100), email:cleanString(data.email,160), education:cleanString(data.education,240), skills:cleanString(data.skills,500), projects:cleanString(data.projects,2000) };
    if(resume.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.email)) return send(res,400,{error:'Enter a valid email address.'});
    store.resumes.default=resume; await putStore(store); return send(res,200,resume);
  }
  if(req.method==='GET'&&url.pathname==='/api/jobs') {
    const store=await getStore();const score=store.assessments[0]?.score||0;
    return send(res,200,{ demo:true, jobs:sampleJobs.map(job=>({...job,match:Math.max(45,job.match-(score?Math.round((80-score)/8):8))})) });
  }
  return send(res,404,{error:'API route not found.'});
}
async function serve(req,res) {
  const url=new URL(req.url,'http://localhost');
  try {
    if(url.pathname.startsWith('/api/')) return await api(req,res,url);
    if(req.method!=='GET'&&req.method!=='HEAD') return send(res,405,{error:'Method not allowed.'});
    let pathname=decodeURIComponent(url.pathname); if(pathname==='/') pathname='/index.html';
    const path=resolve(root,`.${pathname}`); if(path!==root&&!path.startsWith(root+sep)) return send(res,403,{error:'Forbidden.'});
    const content=await readFile(path); res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}); res.end(req.method==='HEAD'?undefined:content);
  } catch(error) { send(res,error.status||500,{error:error.status?error.message:'Server error.'}); if(!error.status) console.error(error); }
}
createServer(serve).listen(port,()=>console.log(`SkillPath AI demo server listening on http://localhost:${port}`));
