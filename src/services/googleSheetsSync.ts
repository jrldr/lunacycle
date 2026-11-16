import { CycleRecord, DailyLog, UserProfile } from '../types/cycle';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * LunaCycle — Google Sheets Database Backend (Apps Script)
 * 
 * Setup:
 * 1. Open Google Sheets and create a new spreadsheet (e.g. "LunaCycle Data").
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any existing code and paste this entire script.
 * 4. Click Save, then Deploy -> New deployment.
 * 5. Select Type: "Web app".
 * 6. Set "Execute as": Me, and "Who has access": Anyone.
 * 7. Click Deploy, authorize access, and copy the Web app URL into LunaCycle.
 */

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'pull';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return jsonResponse({ ok: true, sheetName: ss.getName(), timestamp: new Date().toISOString() });
    }

    var profileSheet = getOrCreateSheet(ss, 'Profile', [
      'name', 'birthday', 'weightKg', 'heightCm', 'weightUnit', 'heightUnit',
      'baselineCycleLength', 'baselinePeriodLength', 'notificationsEnabled', 'updatedAt'
    ]);
    var cyclesSheet = getOrCreateSheet(ss, 'Cycles', [
      'id', 'startDate', 'endDate', 'cycleLength', 'periodLength', 'notes', 'updatedAt'
    ]);
    var logsSheet = getOrCreateSheet(ss, 'DailyLogs', [
      'date', 'flow', 'symptoms', 'mood', 'cervicalMucus', 'bbtCelsius', 'notes', 'updatedAt'
    ]);

    var profile = null;
    if (profileSheet.getLastRow() >= 2) {
      var pRow = profileSheet.getRange(2, 1, 1, 10).getValues()[0];
      profile = {
        name: String(pRow[0] || ''),
        birthday: String(pRow[1] || ''),
        weightKg: pRow[2] === '' ? '' : Number(pRow[2]),
        heightCm: pRow[3] === '' ? '' : Number(pRow[3]),
        weightUnit: pRow[4] === 'lbs' ? 'lbs' : 'kg',
        heightUnit: pRow[5] === 'ft' ? 'ft' : 'cm',
        baselineCycleLength: Number(pRow[6]) || 28,
        baselinePeriodLength: Number(pRow[7]) || 5,
        notificationsEnabled: Boolean(pRow[8]),
        updatedAt: String(pRow[9] || new Date().toISOString())
      };
    }

    var cycles = [];
    if (cyclesSheet.getLastRow() >= 2) {
      var cRows = cyclesSheet.getRange(2, 1, cyclesSheet.getLastRow() - 1, 7).getValues();
      cycles = cRows
        .filter(function(r) { return r[0] && r[1]; })
        .map(function(r) {
          return {
            id: String(r[0]),
            startDate: formatCellDate(r[1]),
            endDate: formatCellDate(r[2]),
            cycleLength: r[3] === '' ? undefined : Number(r[3]),
            periodLength: Number(r[4]) || 5,
            notes: String(r[5] || ''),
            updatedAt: String(r[6] || '')
          };
        });
    }

    var logs = {};
    if (logsSheet.getLastRow() >= 2) {
      var lRows = logsSheet.getRange(2, 1, logsSheet.getLastRow() - 1, 8).getValues();
      lRows.forEach(function(r) {
        var dateKey = formatCellDate(r[0]);
        if (!dateKey) return;
        var syms = [];
        try { syms = r[2] ? JSON.parse(r[2]) : []; } catch (err) { syms = []; }
        logs[dateKey] = {
          date: dateKey,
          flow: String(r[1] || 'none'),
          symptoms: Array.isArray(syms) ? syms : [],
          mood: r[3] ? String(r[3]) : undefined,
          cervicalMucus: r[4] ? String(r[4]) : undefined,
          bbtCelsius: r[5] === '' ? undefined : Number(r[5]),
          notes: String(r[6] || ''),
          updatedAt: String(r[7] || '')
        };
      });
    }

    return jsonResponse({
      ok: true,
      sheetName: ss.getName(),
      profile: profile,
      cycles: cycles,
      logs: logs
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === 'sync_all') {
      var profileSheet = getOrCreateSheet(ss, 'Profile', [
        'name', 'birthday', 'weightKg', 'heightCm', 'weightUnit', 'heightUnit',
        'baselineCycleLength', 'baselinePeriodLength', 'notificationsEnabled', 'updatedAt'
      ]);
      var cyclesSheet = getOrCreateSheet(ss, 'Cycles', [
        'id', 'startDate', 'endDate', 'cycleLength', 'periodLength', 'notes', 'updatedAt'
      ]);
      var logsSheet = getOrCreateSheet(ss, 'DailyLogs', [
        'date', 'flow', 'symptoms', 'mood', 'cervicalMucus', 'bbtCelsius', 'notes', 'updatedAt'
      ]);

      if (payload.profile) {
        var p = payload.profile;
        if (profileSheet.getLastRow() >= 2) {
          profileSheet.getRange(2, 1, 1, 10).setValues([[
            p.name || '',
            p.birthday || '',
            p.weightKg === '' ? '' : p.weightKg,
            p.heightCm === '' ? '' : p.heightCm,
            p.weightUnit || 'kg',
            p.heightUnit || 'cm',
            p.baselineCycleLength || 28,
            p.baselinePeriodLength || 5,
            Boolean(p.notificationsEnabled),
            p.updatedAt || new Date().toISOString()
          ]]);
        } else {
          profileSheet.appendRow([
            p.name || '',
            p.birthday || '',
            p.weightKg === '' ? '' : p.weightKg,
            p.heightCm === '' ? '' : p.heightCm,
            p.weightUnit || 'kg',
            p.heightUnit || 'cm',
            p.baselineCycleLength || 28,
            p.baselinePeriodLength || 5,
            Boolean(p.notificationsEnabled),
            p.updatedAt || new Date().toISOString()
          ]);
        }
      }

      if (Array.isArray(payload.cycles)) {
        if (cyclesSheet.getLastRow() >= 2) {
          cyclesSheet.getRange(2, 1, cyclesSheet.getLastRow() - 1, 7).clearContent();
        }
        if (payload.cycles.length > 0) {
          var cycleRows = payload.cycles.map(function(c) {
            return [
              c.id,
              c.startDate,
              c.endDate || '',
              c.cycleLength || '',
              c.periodLength || 5,
              c.notes || '',
              c.updatedAt || new Date().toISOString()
            ];
          });
          cyclesSheet.getRange(2, 1, cycleRows.length, 7).setValues(cycleRows);
        }
      }

      if (payload.logs && typeof payload.logs === 'object') {
        if (logsSheet.getLastRow() >= 2) {
          logsSheet.getRange(2, 1, logsSheet.getLastRow() - 1, 8).clearContent();
        }
        var logKeys = Object.keys(payload.logs).sort();
        if (logKeys.length > 0) {
          var logRows = logKeys.map(function(k) {
            var l = payload.logs[k];
            return [
              l.date,
              l.flow || 'none',
              JSON.stringify(l.symptoms || []),
              l.mood || '',
              l.cervicalMucus || '',
              typeof l.bbtCelsius === 'number' ? l.bbtCelsius : '',
              l.notes || '',
              l.updatedAt || new Date().toISOString()
            ];
          });
          logsSheet.getRange(2, 1, logRows.length, 8).setValues(logRows);
        }
      }

      return jsonResponse({
        ok: true,
        syncedAt: new Date().toISOString(),
        sheetName: ss.getName()
      });
    }

    return jsonResponse({ ok: false, error: 'Unsupported action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function formatCellDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).slice(0, 10);
}
`;

export interface SheetSyncResponse {
  ok: boolean;
  sheetName?: string;
  syncedAt?: string;
  error?: string;
  profile?: Partial<UserProfile> | null;
  cycles?: CycleRecord[];
  logs?: Record<string, DailyLog>;
}

export function isValidAppsScriptUrl(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://script.google.com/macros/') ||
    trimmed.startsWith('https://script.googleusercontent.com/')
  );
}

export async function testAppsScriptConnection(url: string): Promise<SheetSyncResponse> {
  const cleanUrl = url.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    return {
      ok: false,
      error: 'Please enter a valid Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec).',
    };
  }

  const separator = cleanUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${cleanUrl}${separator}action=ping`, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}: Unable to reach Apps Script endpoint.` };
  }

  const data = (await res.json()) as SheetSyncResponse;
  return data;
}

export async function pushAllToGoogleSheet(
  url: string,
  payload: {
    profile: UserProfile;
    cycles: CycleRecord[];
    logs: Record<string, DailyLog>;
  }
): Promise<SheetSyncResponse> {
  const cleanUrl = url.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    return { ok: false, error: 'Invalid Google Apps Script URL.' };
  }

  const res = await fetch(cleanUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'sync_all',
      profile: payload.profile,
      cycles: payload.cycles,
      logs: payload.logs,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `Sync failed with HTTP ${res.status}.` };
  }

  const data = (await res.json()) as SheetSyncResponse;
  return data;
}

export async function pullAllFromGoogleSheet(url: string): Promise<SheetSyncResponse> {
  const cleanUrl = url.trim();
  if (!isValidAppsScriptUrl(cleanUrl)) {
    return { ok: false, error: 'Invalid Google Apps Script URL.' };
  }

  const separator = cleanUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${cleanUrl}${separator}action=pull`, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    return { ok: false, error: `Pull failed with HTTP ${res.status}.` };
  }

  const data = (await res.json()) as SheetSyncResponse;
  return data;
}
