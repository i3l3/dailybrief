-- Retain the shared visit cursor independently of the former login account.
CREATE TABLE app_state (
  id integer PRIMARY KEY CHECK(id=1),
  last_visit timestamptz
);
INSERT INTO app_state(id,last_visit)
SELECT 1,(SELECT last_visit FROM owner WHERE id=1);

DROP TABLE sessions;
DROP TABLE login_attempts;
DROP TABLE owner;
