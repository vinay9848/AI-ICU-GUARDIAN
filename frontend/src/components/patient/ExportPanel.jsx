import { getVitals, getRisk } from '../../api/client';

export default function ExportPanel({ patientId, patientData }) {

  const exportCSV = async () => {
    try {
      const res = await getVitals(patientId, 720);
      const readings = res.data.readings;
      if (!readings.length) return;

      const headers = Object.keys(readings[0]);
      const csv = [
        headers.join(','),
        ...readings.map(r => headers.map(h => r[h] ?? '').join(','))
      ].join('\n');

      download(csv, `patient_${patientId}_vitals.csv`, 'text/csv');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const exportJSON = async () => {
    try {
      const [vitalsRes, riskRes] = await Promise.all([
        getVitals(patientId, 720),
        getRisk(patientId),
      ]);
      const json = JSON.stringify({
        patient: patientData,
        risk_analysis: riskRes.data,
        vitals: vitalsRes.data,
      }, null, 2);
      download(json, `patient_${patientId}_full_report.json`, 'application/json');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const [vitalsRes, riskRes] = await Promise.all([
        getVitals(patientId, 48),
        getRisk(patientId),
      ]);

      const doc = new jsPDF();
      const risk = riskRes.data;
      const readings = vitalsRes.data.readings;

      // --- Header ---
      doc.setFontSize(20);
      doc.setTextColor(43, 108, 176);
      doc.text('AI ICU Guardian', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Patient Report', 14, 28);
      doc.setDrawColor(43, 108, 176);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 196, 32);

      // --- Patient Info ---
      let y = 40;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Patient Information', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60);
      if (patientData) {
        const info = [
          ['Patient ID', `ICU-${patientId}`],
          ['Name', patientData.name || '—'],
          ['Age', `${patientData.age}`],
          ['Gender', patientData.gender === 'F' ? 'Female' : 'Male'],
          ['Care Unit', patientData.care_unit],
          ['Status', patientData.status?.toUpperCase()],
          ['Admission Type', patientData.admission_type],
        ];
        autoTable(doc, {
          body: info,
          startY: y,
          theme: 'plain',
          styles: { fontSize: 10, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // --- AI Risk Analysis ---
      if (risk) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('AI Risk Analysis', 14, y);
        y += 8;

        const riskColor = risk.risk_score >= 0.7 ? [220, 50, 50]
          : risk.risk_score >= 0.4 ? [220, 160, 0] : [34, 139, 34];

        const riskInfo = [
          ['Risk Score', `${Math.round(risk.risk_score * 100)}%`],
          ['Risk Level', risk.risk_level?.toUpperCase()],
          ['MEWS Score', `${risk.mews_score}`],
        ];
        autoTable(doc, {
          body: riskInfo,
          startY: y,
          theme: 'plain',
          styles: { fontSize: 10, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
          didParseCell: (data) => {
            if (data.column.index === 1 && data.row.index === 0) {
              data.cell.styles.textColor = riskColor;
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });
        y = doc.lastAutoTable.finalY + 6;

        // Detected patterns
        if (risk.detected_patterns?.length > 0) {
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text('Detected Patterns:', 14, y);
          y += 5;
          doc.setFontSize(9);
          doc.setTextColor(80);
          risk.detected_patterns.forEach(p => {
            doc.text(`  - ${p}`, 16, y);
            y += 5;
          });
          y += 3;
        }

        // Possible risks
        if (risk.possible_risks?.length > 0) {
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text('Possible Risks:', 14, y);
          y += 5;
          doc.setFontSize(9);
          doc.setTextColor(80);
          risk.possible_risks.forEach(r => {
            doc.text(`  - ${r}`, 16, y);
            y += 5;
          });
          y += 3;
        }

        // Recommendations
        if (risk.recommendations?.length > 0) {
          doc.setFontSize(11);
          doc.setTextColor(43, 108, 176);
          doc.text('Recommendations:', 14, y);
          y += 5;
          doc.setFontSize(9);
          doc.setTextColor(60);
          risk.recommendations.forEach(r => {
            doc.text(`  - ${r}`, 16, y);
            y += 5;
          });
          y += 3;
        }

        // Predictive insights
        if (risk.predictions) {
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text('AI Predictive Insights:', 14, y);
          y += 6;
          const predRows = [
            ['Hypertension Crisis', `${Math.round((risk.predictions.hypertension_crisis || 0) * 100)}%`],
            ['Respiratory Distress', `${Math.round((risk.predictions.respiratory_distress || 0) * 100)}%`],
            ['Cardiac Event', `${Math.round((risk.predictions.cardiac_event || 0) * 100)}%`],
            ['Sepsis', `${Math.round((risk.predictions.sepsis || 0) * 100)}%`],
          ];
          autoTable(doc, {
            body: predRows,
            startY: y,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
          });
          y = doc.lastAutoTable.finalY + 4;

          if (risk.predictions.condition_forecast) {
            doc.setFontSize(9);
            doc.setTextColor(60);
            doc.text(`Forecast: ${risk.predictions.condition_forecast}`, 14, y);
            y += 8;
          }
        }
      }

      // --- Vitals Table (new page if needed) ---
      if (readings.length > 0) {
        if (y > 200) doc.addPage();
        else y += 5;

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Vital Signs History', 14, y > 200 ? 20 : y);

        const headers = ['Time', 'HR', 'BP Sys', 'BP Dia', 'SpO2', 'Temp', 'Glucose', 'RR'];
        const rows = readings.map(r => [
          r.timestamp ? new Date(r.timestamp).toLocaleString() : '—',
          r.heart_rate ?? '—',
          r.bp_systolic ?? '—',
          r.bp_diastolic ?? '—',
          r.spo2 ?? '—',
          r.temperature ?? '—',
          r.glucose ?? '—',
          r.respiration_rate ?? '—',
        ]);

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: (y > 200 ? 28 : y + 6),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [43, 108, 176] },
        });
      }

      // --- Footer ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `AI ICU Guardian Report — Generated ${new Date().toLocaleString()} — Page ${i}/${pageCount}`,
          14, 290
        );
      }

      doc.save(`patient_${patientId}_report.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-4 transition-colors">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Download Report</h3>
      <div className="flex gap-2">
        <button onClick={exportCSV}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          Export CSV
        </button>
        <button onClick={exportJSON}
          className="px-4 py-2 bg-medical-blue text-white text-sm rounded-lg hover:bg-medical-blue-dark transition-colors">
          Export JSON
        </button>
        <button onClick={exportPDF}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
          Download PDF Report
        </button>
      </div>
    </div>
  );
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
