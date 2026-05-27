# API Specification

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Authenticated but not authorized |
| 404 | NOT_FOUND | Resource does not exist |
| 405 | METHOD_NOT_ALLOWED | Method not allowed |
| 409 | CONFLICT | Resource already exists |
| 500 | INTERNAL_ERROR | Server error |

## Campaign List API - `src/pages/api/campaign/index.ts`

`GET /api/campaign`. Get all campaigns tied to user.
`POST /api/campaign`. Creates new campaign and makes user GM.

**Method:** `GET` and `POST` only. Returns `405` for any other method.

**Returns:** `{ campaigns: [{ id, name, description, role }] }` or `{ campaignId }`

**Preconditions:**
- Must be signed in

## Campaign Modification API - `src/pages/api/campaign/[id]/index.ts`

`GET /api/campaign/[id]`. Get all campaign information for campaign dashboard.
`PUT /api/campaign/[id]`. Modify campaign details. Remove campaign member.
`DELETE /api/campaign/[id]`. Delete the campaign.

**Method:** `GET, PUT, DELETE` only. Returns `405` for  all other methods.

**PUT Body:** `{ name?, description?, removeMemberId? }`

**GET Return:** `{ name, description, inviteUrl, members: [{ userId, role }], maps: [{ id, name }] }`

**Preconditions:**
- Must be signed in
- PUT and DELETE can only be accessed by GM.
- GET can only be accessed by campaign members.

## Campaign Join API - `src/pages/api/campaign/join.ts`

`POST /api/campaign/join`. User joins a campaign

**Body:** `{ inviteCode }`

**Method:** `POST` only. Returns `405` for any other method.

**Returns:** `{ campaignId }`

**Preconditions:**
- Must be signed in
- Must not be already in the joining campaign

## Invite Regenerate API - `src/pages/api/campaign/[id]/invite.ts`

`PUT /api/campaign/[id]/invite`. Regenerate invite code.

**Method:** `PUT` only. Returns `405` for all other methods.

**Returns:** `{ inviteUrl }`

**Preconditions:**
- Must be signed in and GM. 

## Map Creation API - `src/pages/api/campaign/[id]/map/index.ts`

`POST /api/campaign/[id]/map`. Make a new map. Set current map as new map.

**Method:** `POST` only. Returns `405` for any other method.

**Body:** `{ name, description? }`

**Returns:** `{ mapId }`

**Preconditions:**
- Must be signed in
- Must be the GM of the campaign in which the map is made

## Map Modify API - `src/pages/api/campaign/[id]/map/[mapId].ts`

`GET /api/campaign/[id]/map/[mapId]`. Get all map information for 3d placement.
`PUT /api/campaign/[id]/map/[mapId]`. Modify map details. Called automatically for autosave during map editing.
`DELETE /api/campaign/[id]/map/[mapId]`. Delete the map. Set last created map as current. Returns `409` if trying to delete last map.

**Method:** `GET, PUT, DELETE` only. Returns `405` for all other methods.

**PUT Body:** `{ name?, description?, data?, isPublished?: boolean }`

**GET Return:** `{ name, description, data, isPublished }`

**Preconditions:**
- Must be signed in
- PUT and DELETE can only be accessed by GM.
- GET can only be accessed by campaign members.

## Assets API - `src/pages/api/assets/index.ts`

`GET /api/assets`. Get all available assets (default + user's own)
`POST /api/assets`. Saves CDN URLs.

**Method:** `GET`, `POST` only. Returns `405` for all other methods.

**POST Body:** `{ name, type, description?, url, thumbnailUrl }`

**GET Return:** `{ assets: [{ id, name, type, description, url, thumbnailUrl }] }`

**Preconditions:**
- Must be signed in

## Assets API - `src/pages/api/assets/upload.ts`

`POST /api/assets/upload`. Requests presigned upload URL for both asset and thumbnail.

**Method:** `POST` only. Returns `405` for all other methods.

**Body:** `{ filename, contentType, thumbnailContentType }`

**Returns:** `{ uploadUrl, thumbnailUploadUrl, url, thumbnailUrl }`

**Preconditions:**
- Must be signed in

## Assets Delete API - `src/pages/api/assets/[id].ts`

`DELETE /api/assets/[id]`. Delete asset from database, asset storage, and thumbnail storage, owner only

**Method:** `DELETE` only. Returns `405` for all other methods.

**Preconditions:**
- Must be signed in
- Must own asset for `DELETE`