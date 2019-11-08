/* eslint-disable eqeqeq */
/* eslint-disable quotes */
const express =require('express');
const xss = require('xss');
const articlesRouter = express.Router();
const jsonParser = express.json();

const ArticlesService = require('./articles-service');

const serializeArticle = article => ({
  id: article.id,
  style: article.style,
  title: xss(article.title),
  content: xss(article.content),
  date_published: article.date_published,
});

articlesRouter
    .route('/')
    .get((req, res, next) => {
      const knexInstance = req.app.get('db');
      ArticlesService.getAllArticles(knexInstance)
        .then(articles => {
            if(!articles) {
              return res.status(400).json({
                error: { message: 'Article doesn\'t exist' }
              });
            }
          res.json(articles.map(serializeArticle));
        })
        .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
      const { title, content, style } = req.body;
      const newArticle = { title, content, style };

      
      //refactoring for if(!title) and (!content)
      for (const [key, value] of Object.entries(newArticle)) {
        if (value == null) {
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body` }
          });
        }
      }

      const knexInstance = req.app.get('db');
      ArticlesService.insertArticle(knexInstance,newArticle)
        .then(article => {
          res
            .status(201)
            .location(`/articles/${article.id}`)
            .json(serializeArticle(article));
        })
        .catch(next);
    });


  articlesRouter
  .route('/:article_id')
  .all((req, res, next) => {

      const knexInstance = req.app.get('db');
      ArticlesService.getById(knexInstance, req.params.article_id)
        .then(article => {
          if(!article) {
            return res.status(400).json({
              error: { message: `Article doesn't exist` }
            });
          }
          res.article = article;
          next();
        })
        .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeArticle(res.article));
  })
  .delete((req, res, next) => {
      const knexInstance = req.app.get('db');
      ArticlesService.deleteArticle(knexInstance, req.params.article_id)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = articlesRouter;