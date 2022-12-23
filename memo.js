class Memo {
  constructor() {
    this.db = new sqlite3.Database("./memo.db");
    this.db.serialize(() => {
      this.db.run("create table if not exists memo(id,line,memo)");
    });
  }

  exec(ope) {
    if (typeof ope === "undefined") {
      this.#save(require("fs").readFileSync("/dev/stdin", "utf-8").split("\n"));
    }
    switch (ope) {
      case "-l":
        this.#list();
        break;
      case "-r":
        this.#read();
        break;
      case "-d":
        this.#delete();
        break;
      default:
        console.log("Usage: node memo.js <-l or -r or -d>");
    }
  }

  #save(inputData) {
    new Promise((resolve, reject) => {
      this.db.all(
        "select ifnull(max(id) + 1,1) as id from memo",
        (err, row) => {
          if (err) {
            return reject(err.message);
          }
          return resolve(row);
        }
      );
    })
      .then((resolve) => {
        const id = resolve[0]["id"];

        this.db.serialize(() => {
          let statement = this.db.prepare(
            "insert into memo(id, line, memo) values(?, ?, ?)"
          );
          inputData.forEach((memo, line) => {
            statement.run([id, line, memo]);
          });
          statement.finalize();

          console.log("registration complete.");
        });
      })
      .catch((reject) => {
        console.error(reject);
      });
  }

  #list() {
    this.db.all(
      "select memo from memo where line = 0 order by id",
      (err, row) => {
        if (err) {
          console.error(err.message);
          return;
        }

        if (!row.length) {
          console.error("no notes.");
          return;
        }

        row.forEach((value) => {
          console.log(value["memo"]);
        });
      }
    );
  }

  #read() {
    this.#chooseListID("see")
      .then((resolve) => {
        this.db.all(
          "select * from memo where id = ? order by line",
          resolve,
          (err, rows) => {
            if (err) {
              console.error(err.message);
            }
            rows.forEach((row) => {
              console.log(row.memo);
            });
          }
        );
      })
      .catch((reject) => {
        console.error(reject);
      });
  }

  #delete() {
    this.#chooseListID("delete")
      .then((resolve) => {
        this.db.run("delete from memo where id = ?", resolve, (err) => {
          if (err) {
            console.error(err.message);
          }
        });
      })
      .catch((reject) => {
        console.error(reject);
      });
  }

  #chooseListID(action) {
    const choose = new Promise((resolve, reject) => {
      this.db.all(
        "select id, memo from memo where line = 0 order by id",
        (err, row) => {
          if (err) {
            return reject(err.message);
          }

          (async () => {
            if (!row.length) {
              return reject("no notes.");
            }

            let list = {
              type: "select",
              name: "choose",
              message: "Choose a note you want to " + action + ":",
              choices: [],
              result(names) {
                return this.map(names);
              },
            };

            row.forEach((value) => {
              list.choices.push({ name: value["memo"], value: value["id"] });
            });

            const selectID = await enquirer.prompt(list);
            return resolve(Number(Object.values(selectID.choose)));
          })();
        }
      );
    });
    return choose;
  }
}

const sqlite3 = require("sqlite3");
const enquirer = require("enquirer");
const memo = new Memo();
if (typeof process.argv[3] === "undefined") {
  memo.exec(process.argv[2]);
} else {
  console.error("Usage: node memo.js <-l or -r or -daa>");
}
