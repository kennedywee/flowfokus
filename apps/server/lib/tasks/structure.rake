# pg_dump 17+ writes settings that older PostgreSQL servers reject.
# Strip them so db/structure.sql loads on PostgreSQL 15 and later.
Rake::Task["db:schema:dump"].enhance do
  path = Rails.root.join("db/structure.sql")
  next unless path.exist?

  sql = path.read
  cleaned = sql.gsub(/^SET transaction_timeout = 0;\n/, "").gsub(/^\\(un)?restrict .*\n/, "")
  path.write(cleaned) unless cleaned == sql
end
