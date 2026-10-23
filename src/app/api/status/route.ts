import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    const widgets = await query("SELECT * FROM widget_cache");
    return Response.json({
      widgets: Object.fromEntries(
        widgets.rows.map((w) => [
          w.id,
          { data: w.data, updated_at: w.updated_at, error: w.error },
        ]),
      ),
      collectors: (
        await query("SELECT id,last_success,error FROM collector_state")
      ).rows,
      accounts: (
        await query(
          "SELECT id,provider,label,email,auto_summary,excluded_senders,excluded_folders,status,last_sync FROM accounts",
        )
      ).rows,
    });
  } catch (e) {
    return apiError(e);
  }
}
