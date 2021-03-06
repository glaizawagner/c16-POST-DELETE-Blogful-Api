/* eslint-disable quotes */
/* eslint-disable no-mixed-spaces-and-tabs */
// const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray, makeMaliciousArticle } = require('./articles.fixtures');

//only is added so that we're only running this files while working on it
describe('Articles Endpoints', function() {
    let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    //db is the knexInstance
    app.set('db', db);
  });
  //Mocha hooks - we can pass description as the first argument for labeling purposes
  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('blogful_articles').truncate());

  afterEach('cleanup', () => db('blogful_articles').truncate());

    describe(`GET /articles`, () => {
        context(`Given no articles`, () => {
            it(`responds with 200 and an empty list`, () => {
              return supertest(app)
                .get('/articles')
                .expect(200, []);
            });
          });

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
            
            beforeEach('insert articles', () => {
                return db
                .into('blogful_articles')
                .insert(testArticles);
            });

            it('GET /articles responds with 200 and all of the articles', () => {
                return supertest(app)
                .get('/articles')
                .expect(200, testArticles);
            });
        });
        context(`Given an XSS attack article`, () => {
          const { maliciousArticle, expectedArticle } = makeMaliciousArticle()
    
          beforeEach('insert malicious article', () => {
            return db
              .into('blogful_articles')
              .insert([ maliciousArticle ]);
          });
    
          it('removes XSS attack content', () => {
            return supertest(app)
              .get(`/articles`)
              .expect(200)
              .expect(res => {
                expect(res.body[0].title).to.eql(expectedArticle.title);
                expect(res.body[0].content).to.eql(expectedArticle.content);
              });
          });
        });
    }); //end of GET /articles

    describe(`GET /articles/:article_id`, () => {
      context(`Given no articles`, () => {
        it(`responds with 400`, () => {
          const articleId = 123456;
          return supertest(app)
            .get(`/articles/${articleId}`)
            .expect(400, { error: { message: `Article doesn't exist` } });
        });
      });

      context('Given there are articles in the database', () => {
          const testArticles = makeArticlesArray();
    
          beforeEach('insert articles', () => {
            return db
              .into('blogful_articles')
              .insert(testArticles);
          });
    
          it('responds with 200 and the specified article', () => {
            const articleId = 2;
            const expectedArticle = testArticles[articleId - 1];
            return supertest(app)
              .get(`/articles/${articleId}`)
              .expect(200, expectedArticle);
          });
      });

      context(`Given an XSS attack article`, () => {
        const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
  
        beforeEach('insert malicious article', () => {
          return db
            .into('blogful_articles')
            .insert([ maliciousArticle ]);
        });
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/articles/${maliciousArticle.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql(expectedArticle.title);
              expect(res.body.content).to.eql(expectedArticle.content);
        });
      });
    });
        
    });//end of GET /articles/:article_id

    //POST
    describe(`POST /articles`, () => {
        //creates an article
        it(`creates an article, responding with 201 and the new article`, function() {
          this.retries(3);
          const newArticle = {
            title: 'Test new article',
            style: 'Listicle',
            content: 'Test new article content...'
          };
          return supertest(app)
            .post('/articles')
            .send(newArticle)
            .expect(201)
            .expect(res => {
              expect(res.body.title).to.eql(newArticle.title);
              expect(res.body.style).to.eql(newArticle.style);
              expect(res.body.content).to.eql(newArticle.content);
              expect(res.body).to.have.property('id');
              expect(res.headers.location).to.eql(`/articles/${res.body.id}`);
              const expected = new Date().toLocaleString('en', { timeZone: 'UTC' });
              const actual = new Date(res.body.date_published).toLocaleString();
              expect(actual).to.eql(expected);
            })
            .then(postRes =>
                supertest(app)
                  .get(`/articles/${postRes.body.id}`)
                  .expect(postRes.body)
            );
        });

        // //title is missing
        // it(`responds with 400 and an error message when the 'title' is missing`, () => {
        //   return supertest(app)
        //     .post('/articles')
        //     .send({
        //       style: 'Listicle',
        //       content: 'Test new article content...'
        //     })
        //     .expect(400, {
        //       error: { message: `Missing 'title' in request body` }
        //     });
        // });
        // //content is missing
        // it(`responds with 400 and an error message when the 'content' is missing`, () => {
        //     return supertest(app)
        //       .post('/articles')
        //       .send({
        //         title: 'Test new article',
        //         style: 'Listicle',
        //       })
        //       .expect(400, {
        //         error: { message: `Missing 'content' in request body` }
        //       });
        // });
        // //style is missing
        // it(`responds with 400 and an error message when the 'style' is missing`, () => {
        //   return supertest(app)
        //     .post('/articles')
        //     .send({
        //       title: 'Test new article',
        //       content: 'Test new article content...'
        //     })
        //     .expect(400, {
        //       error: { message: `Missing 'style' in request body` }
        //     });
        // });

        //refactor equivalent for 400
        const requiredFields = ['title', 'style', 'content'];

        requiredFields.forEach(field => {
          const newArticle = {
            title: 'Test new article',
            style: 'Listicle',
            content: 'Test new article content...'
          };

       it(`responds with 400 and an error message when the '${field}' is missing`, () => {
          delete newArticle[field];

          return supertest(app)
            .post('/articles')
            .send(newArticle)
            .expect(400, {
              error: { message: `Missing '${field}' in request body` }
            });
        });
      });

      it('removes XSS attack content from response', () => {
        const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
        return supertest(app)
          .post(`/articles`)
          .send(maliciousArticle)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(expectedArticle.title);
            expect(res.body.content).to.eql(expectedArticle.content);
          });
      });
    }); //end of post

    //DELETE
    describe(`DELETE /articles/:article_id`, () => {
      context(`Given no articles`, () => {
        it(`responds with 400`, () => {
          const articleId = 123456;
          return supertest(app)
            .delete(`/articles/${articleId}`)
            .expect(400, { error: { message: `Article doesn't exist` } })
        });
      });
  
      context('Given there are articles in the database', () => {
        const testArticles = makeArticlesArray()
  
        beforeEach('insert articles', () => {
          return db
            .into('blogful_articles')
            .insert(testArticles);
        });
  
        it('responds with 204 and removes the article', () => {
          const idToRemove = 2;
          const expectedArticles = testArticles.filter(article => article.id !== idToRemove)
          return supertest(app)
            .delete(`/articles/${idToRemove}`)
            .expect(204)
            .then(res =>
              supertest(app)
                .get(`/articles`)
                .expect(expectedArticles)
            );
        });
      });
    }); //end of delete
});