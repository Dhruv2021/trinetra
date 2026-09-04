import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

function generateGuide() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  }

  function drawHeaderFooter() {
    const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('TRINETRA — Crime Intelligence & Network Analysis System | User Manual', margin, 10);
    doc.text(`Page ${pageNum}`, pageWidth - margin - 12, pageHeight - 8);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  }

  // Cover / Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('TRINETRA CRIME INTELLIGENCE SYSTEM', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Concise Operational Guide: Features, Functions & Step-by-Step Usage', margin + 6, y + 18);
  doc.setFontSize(8);
  doc.text('Version 2.4 | Delhi-NCR Investigation Special Cell', margin + 6, y + 24);

  y += 34;
  drawHeaderFooter();

  // Intro box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('SYSTEM PURPOSE', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const introText = 'Trinetra is an intelligence-led investigation platform designed for law enforcement officers to connect scattered FIR records, automatically extract crime entities (suspects, vehicles, burner phones, bank accounts), and uncover inter-state criminal syndicate networks.';
  const splitIntro = doc.splitTextToSize(introText, contentWidth - 8);
  doc.text(splitIntro, margin + 4, y + 10);

  y += 24;

  const modules = [
    {
      title: '1. Overview (Command Dashboard)',
      badge: 'Command & Monitoring',
      functionality: 'Provides real-time situational awareness of active FIRs, indexed suspect counts, discovered cross-case links, and emerging syndicate threats across jurisdictions.',
      steps: [
        'KPI Metrics: Check real-time counts for Cases, Suspects, Entities, Connections, and Active FIRs.',
        'Syndicate Alert Banner: Highlights fast-growing criminal clusters (e.g. Vehicle Theft Ring). Click "Inspect Syndicate" to load the network graph.',
        'Cross-Case Leads: Review high-confidence connection leads showing match scores (e.g. 95%) and shared entities. Click any card to inspect the connection.',
        'Recent FIRs: Browse latest registered criminal incidents and their direct link counts.'
      ]
    },
    {
      title: '2. Case Repository & Dossier Workspace',
      badge: 'FIR Management',
      functionality: 'Centralized repository of all first information reports (FIRs) with multidimensional search and structured case dossiers.',
      steps: [
        'Search & Filter: Search by FIR number, suspect name, phone, or vehicle plate. Filter by crime type or city.',
        'Case Dossier: Click on any case card to open the complete Case Dossier Modal.',
        'Dossier Details: View incident narrative, extracted entities (phones, vehicles, UPI handles), assigned officer, priority level, and timeline logs.',
        'Register New FIR: Click "+ New FIR" in the top bar to record a new case manually or auto-extract from document text.'
      ]
    },
    {
      title: '3. Syndicate Graph (Case-Centric Network Intelligence)',
      badge: 'Interactive Visual Graph',
      functionality: 'Interactive force-directed graph centered strictly around a single selected root case, mapping its direct entities and high-confidence similar cases (>= 90% cutoff).',
      steps: [
        'Left Panel Case Selector: Search and pick any case (e.g. FIR-101) to make it the central root node.',
        'Graph Canvas: The selected case appears in high-contrast red/rose. Direct entities (suspects, phones, cars) orbit around it.',
        'Similar Cases (>=90%): High-similarity cases appear linked with matching percentages. Click "Focus As Root Node" on any linked case to pivot the analysis.',
        'Canvas Controls: Pan, zoom (scroll or +/- buttons), drag nodes, toggle physics simulation, or export the graph as PNG.'
      ]
    },
    {
      title: '4. Connections (Cross-Case Link Discovery)',
      badge: 'Link Analysis',
      functionality: 'Identifies hidden connections between separate FIRs using shared phone numbers, vehicle registrations, financial identifiers, and suspect co-occurrences.',
      steps: [
        'Corroboration Matrix: Browse ranked leads ordered by match score (e.g., 95% Link).',
        'Inspect Evidentiary Reasons: View corroborated evidence points (e.g., "Identical burner phone active in both crime scenes").',
        'Path Finder: Select any two entities/suspects in the dropdowns to compute the shortest multi-hop connection chain linking them.'
      ]
    },
    {
      title: '5. Timeline Evolution',
      badge: 'Chronological Tracking',
      functionality: 'Chronological reconstruction of criminal activity, showing how syndicates operate and escalate across time.',
      steps: [
        'Time Filtering: Select presets (30 Days, 90 Days, 6 Months) or pick custom date ranges.',
        'Activity Heatmap: Identify peak crime days and coordinated syndicate timing.',
        'Incident Flow: Follow sequential incidents to establish patterns of behavior for court evidence.'
      ]
    },
    {
      title: '6. Geo Intelligence (Geospatial Mapping)',
      badge: 'Spatial Crime Analysis',
      functionality: 'Interactive map pinpointing crime locations, suspect movement corridors, and interstate escape routes.',
      steps: [
        'Explore Map: Pan and zoom across Delhi-NCR and adjacent states.',
        'Map Pins: Click any case pin to preview FIR summary, crime category, and location coordinates.',
        'Corridor Lines: View dashed route corridors showing getaway paths between incident spots.'
      ]
    },
    {
      title: '7. Document Ingestion & AI Entity Extraction',
      badge: 'Automated Processing',
      functionality: 'Converts unstructured text documents (FIR scans, witness statements, CDR logs) into structured database entities.',
      steps: [
        'Upload / Paste: Paste raw complaint text or upload a document file.',
        'Run Extraction: Click "Analyze & Extract Entities" to run the automated AI entity extraction engine.',
        'Review Extracted Data: Inspect extracted names, phone numbers, vehicle numbers, and monetary handles with one-click case creation.'
      ]
    },
    {
      title: '8. AI Copilot (Investigation Assistant)',
      badge: 'Gemini AI Assistant',
      functionality: 'Natural language investigative assistant capable of querying the entire criminal database and synthesizing evidence.',
      steps: [
        'Ask Questions: Type investigative questions like "Which suspects are linked to vehicle DL01AB1234?" or "Summarize the interstate luxury car syndicate".',
        'Suggested Prompts: Click pre-formulated prompts for immediate cross-case pattern analysis.',
        'Cited Sources: Copilot provides direct citations to relevant FIR numbers and suspect records.'
      ]
    },
    {
      title: '9. Formal Reports (Legal Dossiers)',
      badge: 'Court Evidence',
      functionality: 'Generates structured, print-ready investigative reports for court submission, case handovers, and supervisory review.',
      steps: [
        'Select Case: Choose target FIR or syndicate cluster.',
        'Choose Format: Select Charge Sheet Summary, Inter-State Brief, or Entity Profile.',
        'Export: Click "Print / Save PDF" to generate clean, evidentiary documents with officer sign-off sections.'
      ]
    },
    {
      title: '10. Officer Profile Switcher',
      badge: 'Identity Management',
      functionality: 'Switch between registered investigating officer identities without logging out, adapting permissions and assigned case views.',
      steps: [
        'Profile Icon: In the top-right navigation bar, click the circular officer avatar icon.',
        'Officer Menu: An inspector selection popover will appear showing active officers (Inspector Kabir Rathore, ACP Sunita Verma, Sub-Inspector Rohit Malik).',
        'Switch Profile: Click any officer to immediately switch your active session profile.'
      ]
    }
  ];

  modules.forEach((mod) => {
    checkPageBreak(38);

    // Section title
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(mod.title, margin + 3, y + 5);

    // Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(2, 132, 199); // sky-600
    const badgeWidth = doc.getTextWidth(mod.badge) + 4;
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(pageWidth - margin - badgeWidth - 2, y + 1.2, badgeWidth, 4.6, 1, 1, 'F');
    doc.text(mod.badge, pageWidth - margin - badgeWidth, y + 4.5);

    y += 10;

    // Functionality
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Primary Function: ', margin + 2, y);
    const fnTitleWidth = doc.getTextWidth('Primary Function: ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitFn = doc.splitTextToSize(mod.functionality, contentWidth - fnTitleWidth - 4);
    doc.text(splitFn, margin + 2 + fnTitleWidth, y);
    y += splitFn.length * 3.8 + 2;

    // How to Use
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('How to Use:', margin + 2, y);
    y += 4;

    mod.steps.forEach((step) => {
      checkPageBreak(7);
      doc.setFillColor(14, 165, 233);
      doc.circle(margin + 4, y - 1, 0.8, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const splitStep = doc.splitTextToSize(step, contentWidth - 10);
      doc.text(splitStep, margin + 7, y);
      y += splitStep.length * 3.5 + 1.2;
    });

    y += 3;
  });

  // Footer summary box
  checkPageBreak(25);
  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(153, 246, 228);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 78, 74);
  doc.text('QUICK SHORTCUTS & BEST PRACTICES', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 118, 110);
  doc.text('1. Pivot Investigations: On the Syndicate Graph, always click "Focus As Root Node" on similar cases to trace criminal branches.', margin + 4, y + 9.5);
  doc.text('2. Path Finder: When investigating two seemingly unrelated suspects, run the Path Finder in Connections to expose the middleman.', margin + 4, y + 13.5);

  const outputPath = path.join(process.cwd(), 'public', 'Trinetra_User_Guide.pdf');
  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfOutput));
  console.log('Successfully generated PDF at:', outputPath);
}

generateGuide();
