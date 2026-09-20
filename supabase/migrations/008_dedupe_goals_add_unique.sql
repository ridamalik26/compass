begin;

-- keep the oldest row per user (preserves the pace start date; the dupes are double-submit copies)
delete from goals g using (
  select id, row_number() over (partition by user_session_id order by created_at, id) rn from goals
) d where g.id = d.id and d.rn > 1;

alter table goals add constraint goals_user_session_id_key unique (user_session_id);

-- per-user transaction uniqueness; keep the old constraint until the new code ships
alter table transactions add constraint transactions_user_tx_key unique (user_session_id, transaction_id);

commit;
