import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization format" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { moodleUrl, moodleToken, action, params } = await req.json();

    if (!moodleUrl || !moodleToken) {
      return new Response(
        JSON.stringify({ error: "Missing moodleUrl or moodleToken" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = `${moodleUrl}/webservice/rest/server.php`;

    const callMoodle = async (
      wsfunction: string,
      extraParams: Record<string, string> = {}
    ) => {
      const urlParams = new URLSearchParams({
        wstoken: moodleToken,
        wsfunction,
        moodlewsrestformat: "json",
        ...extraParams,
      });

      const response = await fetch(
        `${baseUrl}?${urlParams.toString()}`
      );
      const data = await response.json();

      if (data.exception) {
        const isAccessError =
          data.errorcode === "accessexception" ||
          (data.message || "").toLowerCase().includes("access");

        throw {
          message: data.message,
          status: isAccessError ? 403 : 500,
        };
      }

      return data;
    };

    let result: any;

    switch (action) {
      case "get_users_summary": {
        let allUsersList: any[] = [];

        try {
          const res = await callMoodle("core_user_get_users", {
            "criteria[0][key]": "email",
            "criteria[0][value]": "%@%",
          });
          allUsersList = res.users || [];
        } catch {}

        if (allUsersList.length === 0) {
          try {
            const res = await callMoodle("core_user_get_users", {
              "criteria[0][key]": "lastname",
              "criteria[0][value]": "%",
            });
            allUsersList = res.users || [];
          } catch {}
        }

        const users = allUsersList.filter(
          (u: any) => u.id > 1 && u.username !== "guest"
        );

        const active = users.filter(
          (u: any) => !u.suspended && !u.deleted
        ).length;

        const suspended = users.filter(
          (u: any) => u.suspended && !u.deleted
        ).length;

        const deleted = users.filter((u: any) => u.deleted).length;

        result = {
          total: users.length,
          active,
          suspended,
          deleted,
        };
        break;
      }

      case "get_site_info": {
        result = await callMoodle(
          "core_webservice_get_site_info"
        );
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: e?.message || "Internal error",
      }),
      {
        status: e?.status || 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
