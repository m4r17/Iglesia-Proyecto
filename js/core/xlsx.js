App.Xlsx = (function () {
  const encoder = new TextEncoder();

  const crcTable = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  function zip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;
    const stamp = dosDateTime(new Date());

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const data = encoder.encode(file.content);
      const crc = crc32(data);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, stamp.time, true);
      local.setUint16(12, stamp.day, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true);

      chunks.push(new Uint8Array(local.buffer), nameBytes, data);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, 0, true);
      entry.setUint16(12, stamp.time, true);
      entry.setUint16(14, stamp.day, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, nameBytes.length, true);
      entry.setUint32(42, offset, true);

      central.push(new Uint8Array(entry.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });

    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function xml(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function columnName(index) {
    let name = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function cell(value, rowIndex, colIndex, style) {
    const ref = `${columnName(colIndex)}${rowIndex + 1}`;
    const styleAttr = style ? ` s="${style}"` : '';

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
    }

    return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }

  function sheetName(name) {
    return String(name || 'Reporte').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Reporte';
  }

  /**
   * Genera un libro .xlsx con una sola hoja.
   * rows: arreglo de filas; cada fila es un arreglo de valores (number o texto).
   * options.titleRows: cantidad de filas iniciales con estilo de título.
   * options.headerRows: índices de filas con estilo de encabezado.
   * options.moneyColumns: índices de columnas con formato de moneda.
   */
  function build(name, rows, options) {
    const config = options || {};
    const headerRows = new Set(config.headerRows || []);
    const titleRows = config.titleRows || 0;
    const moneyColumns = new Set(config.moneyColumns || []);
    const widths = [];

    rows.forEach((row) => {
      row.forEach((value, index) => {
        const length = String(value == null ? '' : value).length;
        widths[index] = Math.min(Math.max(widths[index] || 10, length + 2), 60);
      });
    });

    const sheetRows = rows.map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => {
        let style = 0;
        if (rowIndex < titleRows) style = 3;
        else if (headerRows.has(rowIndex)) style = 1;
        else if (moneyColumns.has(colIndex) && typeof value === 'number') style = 2;
        return cell(value, rowIndex, colIndex, style);
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

    const cols = widths.length
      ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
      : '';

    const files = [
      {
        name: '[Content_Types].xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/workbook.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${xml(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets>` +
          '</workbook>'
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/styles.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts>' +
          '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
          '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/><bgColor indexed="64"/></patternFill></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="4">' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
          '</cellXfs>' +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
          '</styleSheet>'
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          `${cols}<sheetData>${sheetRows}</sheetData>` +
          '</worksheet>'
      }
    ];

    return zip(files);
  }

  return { build };
})();
