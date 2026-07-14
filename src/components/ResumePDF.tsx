"use client";

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

const ACCENT = "#2563eb";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a1a2e",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  contactItem: {
    fontSize: 9,
    color: "#4a5568",
  },
  contactSep: {
    fontSize: 9,
    color: "#cbd5e0",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  summary: {
    fontSize: 9.5,
    color: "#2d3748",
    lineHeight: 1.5,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillTag: {
    fontSize: 8.5,
    backgroundColor: "#ebf4ff",
    color: ACCENT,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
  },
  experienceItem: {
    marginBottom: 10,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  jobTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  jobDate: {
    fontSize: 8.5,
    color: "#718096",
  },
  company: {
    fontSize: 9.5,
    color: "#4a5568",
    fontStyle: "italic",
    marginBottom: 3,
  },
  bullet: {
    fontSize: 9,
    color: "#2d3748",
    marginLeft: 10,
    marginBottom: 1.5,
    lineHeight: 1.4,
  },
  bulletDot: {
    color: ACCENT,
  },
  educationItem: {
    marginBottom: 8,
  },
  degree: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  school: {
    fontSize: 9.5,
    color: "#4a5568",
  },
  certItem: {
    fontSize: 9,
    color: "#2d3748",
    marginBottom: 2,
    marginLeft: 8,
  },
  projectItem: {
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  refItem: {
    fontSize: 9,
    color: "#2d3748",
    marginBottom: 2,
    marginLeft: 8,
  },
  refName: {
    fontFamily: "Helvetica-Bold",
  },
});

interface ResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  education?: Array<{
    school: string;
    degree: string;
    dates?: string;
  }>;
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string[];
  }>;
  references?: string[];
}

function normalizeSection(line: string): string | null {
  const l = line.toLowerCase().replace(/[:]/g, "").trim();

  if (l.includes("summary") || l.includes("objective") || l.includes("profile") || l === "about me") return "summary";
  if (l.includes("skill") || l.includes("technical") || l.includes("competenc")) return "skills";
  if (l.includes("work experience") || l.includes("employment") || l === "experience" || l.includes("work immersion") || l.includes("internship")) return "experience";
  if (l.includes("educational background") || l.includes("education") || l.includes("academic")) return "education";
  if (l.includes("certification") || l.includes("license") || l.includes("credential")) return "certifications";
  if (l.includes("project") || l.includes("academic project")) return "projects";
  if (l.includes("character reference") || l.includes("reference")) return "references";

  return null;
}

function isLikelyName(line: string): boolean {
  if (line.length > 60 || line.length < 2) return false;
  if (/\d{3,}/.test(line)) return false;
  if (/@/.test(line) || /http/.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  const alphaRatio = line.replace(/[^a-zA-Z\s.-]/g, "").length / line.length;
  return alphaRatio > 0.7;
}

function parseResumeText(text: string): ResumeData {
  const rawLines = text.split("\n");
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const data: ResumeData = { skills: [], experience: [], education: [], certifications: [], projects: [], references: [] };

  // Extract name: first line that looks like a person name
  for (const line of lines.slice(0, 5)) {
    if (isLikelyName(line)) {
      data.name = line.replace(/\s+/g, " ").trim();
      break;
    }
  }
  if (!data.name) data.name = "Your Name";

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  // Extract phone (Philippine format or international)
  const phoneMatch = text.match(/(?:\+63|0)\s*\d{3}\s*\d{3}\s*\d{4}/);
  if (phoneMatch) {
    data.phone = phoneMatch[0].replace(/\s+/g, " ").trim();
  } else {
    const genericPhone = text.match(/[\+]?[\d\s()-]{10,15}/);
    if (genericPhone) data.phone = genericPhone[0].trim();
  }

  // Extract location (look for City/Province patterns or "Address" label)
  const locationMatch = text.match(/((?:[A-Z][a-z]+\s*){1,4}(?:City|Town|Municipality|Province|Village|Barangay))/);
  if (locationMatch) {
    data.location = locationMatch[1].trim();
  } else {
    const addrMatch = text.match(/(?:Address|Location|City)[:\s]+([^\n]+)/i);
    if (addrMatch) data.location = addrMatch[1].trim();
  }

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) data.linkedin = linkedinMatch[0];

  // Section-based parsing
  let currentSection: string | null = null;
  let sectionLines: string[] = [];

  const flushSection = () => {
    if (!currentSection || sectionLines.length === 0) return;
    const content = sectionLines.join("\n");

    switch (currentSection) {
      case "summary":
        data.summary = content;
        break;
      case "skills":
        data.skills = content
          .split(/[,;\n]/)
          .map((s) => s.replace(/^[-–*•▸]\s*/, "").replace(/\s*\(.*?\)\s*/g, " $&").trim())
          .filter((s) => s.length > 1 && s.length < 60);
        break;
      case "experience":
        parseExperienceSection(content, data);
        break;
      case "education":
        parseEducationSection(content, data);
        break;
      case "certifications":
        data.certifications = content
          .split("\n")
          .map((l) => l.replace(/^[-–*•¸▸]\s*/, "").trim())
          .filter((l) => l.length > 2);
        break;
      case "projects":
        parseProjectsSection(content, data);
        break;
      case "references":
        data.references = content
          .split("\n")
          .map((l) => l.replace(/^[-–*•▸]\s*/, "").trim())
          .filter((l) => l.length > 2);
        break;
    }
  };

  // Find where content starts (skip name and contact info at top)
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    if (normalizeSection(lines[i])) {
      startIdx = i;
      break;
    }
    if (i === lines.length - 1) startIdx = 0;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const section = normalizeSection(lines[i]);
    if (section) {
      flushSection();
      currentSection = section;
      sectionLines = [];
    } else if (currentSection) {
      sectionLines.push(lines[i]);
    }
  }
  flushSection();

  return data;
}

function parseExperienceSection(content: string, data: ResumeData) {
  const blocks = content.split(/\n(?=[A-Z])/);
  for (const block of blocks) {
    const blockLines = block.split("\n").filter(Boolean);
    if (blockLines.length === 0) continue;

    const header = blockLines[0];
    // Try "Title, Company (Dates)" or "Title | Company | Dates" or "Title - Company"
    let title = "";
    let company = "";
    let dates = "";
    let bullets: string[] = [];

    // Pattern: "Title, Company (Dates)" or "Title, Company (Remote) Dates"
    const commaMatch = header.match(/^(.+?),\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);
    if (commaMatch) {
      title = commaMatch[1].trim();
      company = commaMatch[2].replace(/\(.*?\)/g, "").trim();
      dates = commaMatch[3]?.trim() || "";
    } else {
      // Pattern: "Title | Company | Dates" or "Title - Company - Dates"
      const pipeParts = header.split(/\s*[|–-]\s*/);
      if (pipeParts.length >= 2) {
        title = pipeParts[0].trim();
        company = pipeParts[1].trim();
        dates = pipeParts[2]?.trim() || "";
      } else {
        title = header;
      }
    }

    // Check if second line is a continuation of header (e.g., dates on separate line)
    let bulletStart = 1;
    if (blockLines.length > 1 && /^\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(blockLines[1])) {
      if (!dates) dates = blockLines[1].trim();
      bulletStart = 2;
    }

    bullets = blockLines
      .slice(bulletStart)
      .map((l) => l.replace(/^[-–*•▸]\s*/, "").trim())
      .filter((l) => l.length > 2);

    data.experience!.push({ title, company, dates, bullets });
  }
}

function parseEducationSection(content: string, data: ResumeData) {
  const blocks = content.split(/\n(?=[A-Z])/);
  for (const block of blocks) {
    const blockLines = block.split("\n").filter(Boolean);
    if (blockLines.length === 0) continue;

    const header = blockLines[0];
    let school = "";
    let degree = "";
    let dates = "";

    // Pattern: "School Name" then "Degree, Dates"
    if (blockLines.length >= 2) {
      school = header;
      degree = blockLines[1].replace(/\(.*?\)/g, "").trim();
      // Extract dates from degree line or next line
      const dateMatch = (blockLines[1] + " " + (blockLines[2] || "")).match(/\d{4}\s*[-–]\s*(?:Present|\d{4})|\d{4}/);
      if (dateMatch) dates = dateMatch[0];
    } else {
      school = header;
    }

    data.education!.push({ school, degree, dates });
  }
}

function parseProjectsSection(content: string, data: ResumeData) {
  const blocks = content.split(/\n(?=[A-Z])/);
  for (const block of blocks) {
    const blockLines = block.split("\n").filter(Boolean);
    if (blockLines.length === 0) continue;

    const name = blockLines[0].replace(/^[-–*•▸]\s*/, "").trim();
    const description = blockLines
      .slice(1)
      .map((l) => l.replace(/^[-–*•▸]\s*/, "").trim())
      .filter((l) => l.length > 2);

    data.projects!.push({ name, description });
  }
}

function ResumePDFDocument({ resumeText }: { resumeText: string }) {
  const data = parseResumeText(resumeText);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          <View style={styles.contactRow}>
            {data.phone && <Text style={styles.contactItem}>{data.phone}</Text>}
            {data.phone && data.email && <Text style={styles.contactSep}>|</Text>}
            {data.email && <Text style={styles.contactItem}>{data.email}</Text>}
            {data.location && (data.email || data.phone) && <Text style={styles.contactSep}>|</Text>}
            {data.location && <Text style={styles.contactItem}>{data.location}</Text>}
            {data.linkedin && <Text style={styles.contactSep}>|</Text>}
            {data.linkedin && <Text style={styles.contactItem}>{data.linkedin}</Text>}
          </View>
        </View>

        {/* Summary */}
        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {data.skills.map((skill, i) => (
                <Text key={i} style={styles.skillTag}>{skill}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{exp.title}</Text>
                  {exp.dates && <Text style={styles.jobDate}>{exp.dates}</Text>}
                </View>
                {exp.company && <Text style={styles.company}>{exp.company}</Text>}
                {exp.bullets.map((bullet, j) => (
                  <Text key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>▸ </Text>{bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj, i) => (
              <View key={i} style={styles.projectItem}>
                <Text style={styles.projectTitle}>{proj.name}</Text>
                {proj.description.map((desc, j) => (
                  <Text key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>▸ </Text>{desc}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.educationItem}>
                <View style={styles.jobHeader}>
                  <Text style={styles.degree}>{edu.school}</Text>
                  {edu.dates && <Text style={styles.jobDate}>{edu.dates}</Text>}
                </View>
                {edu.degree && <Text style={styles.school}>{edu.degree}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert, i) => (
              <Text key={i} style={styles.certItem}>▸ {cert}</Text>
            ))}
          </View>
        )}

        {/* References */}
        {data.references && data.references.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Character References</Text>
            {data.references.map((ref, i) => {
              const parts = ref.split("|").map((p) => p.trim());
              return (
                <Text key={i} style={styles.refItem}>
                  <Text style={styles.refName}>{parts[0]}</Text>
                  {parts.length > 1 && <Text> — {parts.slice(1).join(" | ")}</Text>}
                </Text>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function ResumePDFDownload({ resumeText, fileName }: { resumeText: string; fileName?: string }) {
  return (
    <PDFDownloadLink
      document={<ResumePDFDocument resumeText={resumeText} />}
      fileName={fileName || "enhanced-resume.pdf"}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {loading ? "Generating PDF..." : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
