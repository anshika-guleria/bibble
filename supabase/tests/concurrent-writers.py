"""Real concurrent sessions in a NEW, private, temporary PostgreSQL cluster.

Requires initdb, pg_ctl, and psql on PATH. Never connects to an existing cluster.
The test server listens only on loopback and is stopped in finally. Its temporary
data directory is retained for inspection; no cluster roles or files are deleted.
"""
import os
from pathlib import Path
import subprocess
import socket
import tempfile
import time

root = Path(__file__).resolve().parents[2]
cluster = Path(tempfile.mkdtemp(prefix="bibble-occ-private-"))
with socket.socket() as port_probe:
    port_probe.bind(("127.0.0.1", 0))
    port = port_probe.getsockname()[1]
env = os.environ.copy()
env.update(PGHOST="127.0.0.1", PGPORT=str(port), PGUSER="bibble_test", PGDATABASE="postgres")
writer = None
started = False


def psql(sql, *, check=True):
    return subprocess.run(["psql", "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
                          env=env, text=True, capture_output=True, check=check)


identity = "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';"
try:
    subprocess.run(["initdb", "-D", str(cluster), "-U", "bibble_test", "-A", "trust", "--no-locale", "-E", "UTF8"],
                   check=True, capture_output=True)
    subprocess.run(["pg_ctl", "-D", str(cluster), "-l", str(cluster / "server.log"),
                    "-o", f"-h 127.0.0.1 -p {port}", "-w", "start"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    started = True
    for sql_file in [root / "supabase/tests/bootstrap.sql", root / "supabase/migrations/20261121000000_map_versions.sql"]:
        subprocess.run(["psql", "-X", "-v", "ON_ERROR_STOP=1", "-f", str(sql_file)],
                       env=env, check=True, capture_output=True)
    psql("insert into auth.users values ('00000000-0000-0000-0000-000000000001');"
         + identity + "select save_learning_map_versioned('{\"id\":\"race\",\"title\":\"Original\"}', '[]', '[]', null);")
    writer_env = {**env, "PGAPPNAME": "bibble-occ-writer-a"}
    writer = subprocess.Popen(["psql", "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c",
        "begin;" + identity + "select save_learning_map_versioned('{\"id\":\"race\",\"title\":\"Winner A\"}',"
        " '[{\"id\":\"node-a\",\"title\":\"Completed in A\",\"progress\":100}]', '[]', 1); select pg_sleep(2); commit;"],
        env=writer_env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    deadline = time.monotonic() + 15
    while psql("select count(*) from pg_stat_activity where application_name='bibble-occ-writer-a' and wait_event='PgSleep';").stdout.strip() != "1":
        if writer.poll() is not None or time.monotonic() > deadline:
            raise RuntimeError("Writer A did not acquire the expected transaction lock")
        time.sleep(0.05)
    loser = psql(identity + "select save_learning_map_versioned('{\"id\":\"race\",\"title\":\"Stale B\"}', '[]', '[]', 1);", check=False)
    out, err = writer.communicate(timeout=15)
    assert writer.returncode == 0, err
    assert loser.returncode != 0 and "CONCURRENCY_CONFLICT" in loser.stderr, loser.stderr
    assert psql("select title || ':' || version from learning_maps where id='race';").stdout.strip() == "Winner A:2"
    assert psql("select progress from map_bibbles where id='node-a';").stdout.strip() == "100"
    print("PASS: simultaneous PostgreSQL writers serialize on the map row")
    print("PASS: stale waiting writer receives CONCURRENCY_CONFLICT")
    print("PASS: winning revision 2 and completed node remain intact")
finally:
    if writer and writer.poll() is None:
        writer.terminate()
        writer.communicate(timeout=15)
    if started:
        subprocess.run(["pg_ctl", "-D", str(cluster), "-m", "fast", "-w", "stop"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Stopped private test cluster; temporary inspection files were retained.")
