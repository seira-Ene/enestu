-- 学習記録の1回の上限を、24時間から999時間に広げる。
-- 制約を緩めるだけなので、今ある記録と公開中の画面はそのまま動く。
alter table public.study_logs
  drop constraint study_logs_duration_seconds_check,
  add constraint study_logs_duration_seconds_check
    check (duration_seconds between 1 and 3596400);
