-- Sembunyikan riwayat lama + saldo awal baru + akun Shopeepay.
-- Jalankan di Supabase SQL Editor. Langkah 1 harus dijalankan TERPISAH
-- (Postgres tidak mengizinkan nilai enum baru dipakai dalam transaksi yang sama).

-- ===== Langkah 1 =====
alter type account_type add value if not exists 'Shopeepay';

-- ===== Langkah 2 =====
begin;

alter table transactions add column if not exists is_hidden boolean not null default false;
alter table account_balances add column if not exists is_hidden boolean not null default false;

-- Semua data lama disembunyikan (tidak dihapus).
update transactions set is_hidden = true;
update account_balances set is_hidden = true;

create or replace view balance_per_account as
 select account_type, sum(amount) as balance
   from account_balances
  where not is_hidden
  group by account_type
  order by account_type;

create or replace view balance_view as
 select coalesce(sum(case when type = 'income' then total else 0 end), 0) as total_income,
        coalesce(sum(case when type = 'expense' then total else 0 end), 0) as total_expense,
        coalesce((select sum(balance) from balance_per_account), 0) as balance
   from transactions
  where not is_hidden;

-- Running balance dihitung terpisah untuk data lama dan data baru.
create or replace view transactions_with_balance as
 select id, type, expense_category, income_category, notes, price, quantity, total, created_at,
        sum(case when type = 'income' then total else -total end)
          over (partition by is_hidden order by created_at, id) as running_balance,
        is_hidden
   from transactions t
  order by created_at desc;

-- Saldo awal (tidak dihitung sebagai pemasukan).
insert into account_balances (transaction_id, account_type, amount, notes) values
 (null, 'Saham', 26464537, 'Saldo awal'),
 (null, 'rekening', 4109794, 'Saldo awal'),
 (null, 'Gopay', 19787, 'Saldo awal'),
 (null, 'Shopeepay', 59318, 'Saldo awal');

commit;

-- Cek hasil:
-- select * from balance_per_account;
-- select * from balance_view;
