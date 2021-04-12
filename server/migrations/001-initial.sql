--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE selectors
(
    name            VARCHAR PRIMARY KEY
--     first_seen_at DATE,
--     last_seen_at  DATE
);

CREATE TABLE css_files
(
    name VARCHAR PRIMARY KEY
--     first_seen_at DATE,
--     last_seen_at DATE
);

CREATE TABLE file_selector
(
    selector VARCHAR,
    file VARCHAR
--     CONSTRAINT  bob PRIMARY KEY (selector, file)
);


--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE selectors;
DROP TABLE files;
DROP TABLE file_selector;
