"""Platform SUPER_ADMIN services — authorization, cross-agency aggregates, audit.

SUPER_ADMIN is a Mullen Analytics platform operator role, distinct from AGENCY_ADMIN.
Authorization is a real record (users.platform_role == 'super_admin'); there are no
scattered email checks. Cross-agency visibility is granted ONLY via the authenticated
platform-admin RLS clause (set_platform_context), never by disabling RLS.
"""
