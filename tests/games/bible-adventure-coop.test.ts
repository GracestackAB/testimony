import assert from "node:assert/strict";
import {
  canUserAccessSave,
  isUsersTurn,
} from "../../lib/games/bible-adventure/coop-social";

const hostId = "11111111-1111-1111-1111-111111111111";
const partnerId = "22222222-2222-2222-2222-222222222222";

assert.equal(canUserAccessSave({ user_id: hostId, partner_id: null }, hostId), true);
assert.equal(canUserAccessSave({ user_id: hostId, partner_id: partnerId }, partnerId), true);
assert.equal(canUserAccessSave({ user_id: hostId, partner_id: partnerId }, "other"), false);

assert.equal(
  isUsersTurn({ user_id: hostId, coop_status: "solo", active_turn_user_id: hostId }, hostId),
  true
);
assert.equal(
  isUsersTurn(
    { user_id: hostId, coop_status: "active", active_turn_user_id: partnerId },
    hostId
  ),
  false
);
assert.equal(
  isUsersTurn(
    { user_id: hostId, coop_status: "active", active_turn_user_id: partnerId },
    partnerId
  ),
  true
);

console.log("bible-adventure-coop.test.ts: ok");
