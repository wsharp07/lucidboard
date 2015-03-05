/**
 * Board
 *
 * @module      :: Model
 * @description :: A board is the thing that users collaborate over
 * @docs		    :: http://sailsjs.org/#!documentation/models
 */

var meta       = require('../services/meta'),
    titleRegex = /^.{1,60}$/;

module.exports = {

  schema: true,

  attributes: {

    title: {
      type:  'string',
      regex: titleRegex
    },

    columns: {
      collection: 'column',
      via:        'board'
    },

    creator: { model: 'user' },

    timerLength: 'integer',
    timerStart:  'datetime',


    votesPerUser: {
      type:       'integer',
      min:        0,
      defaultsTo: 0
    },

    p_seeVotes:     'boolean',
    p_seeContent:   'boolean',
    p_combineCards: 'boolean',
    p_lock:         'boolean',

    toJSON: function() {
      var timerLeft = 0;

      if (this.timerStart) {
        timerLeft = parseInt(this.timerLength
          - (new Date().getTime() - this.timerStart.getTime())
          / 1000);
      }

      return {
        id:             this.id,
        title:          this.title,
        columns:        this.columns,
        creator:        this.creator,
        timerLength:    this.timerLength,
        timerLeft:      timerLeft,
        votesPerUser:   this.votesPerUser,
        p_seeVotes:     this.p_seeVotes,
        p_seeContent:   this.p_seeContent,
        p_combineCards: this.p_combineCards,
        p_lock:         this.p_lock
      };
    }
  },

  loadFullById: function(id, _cb) {
    async.auto({
      board: function(cb) {
        Board.findOneById(id).populate('columns').exec(cb);
      },
      cards: ['board', function(cb, r) {
        if (!r.board) {
          r.board = false;
          return cb('Board not found');
        }
        Card.find({column: _.pluck(r.board.columns, 'id')}).exec(cb);
      }],
      votes: ['cards', function(cb, r) {
        Vote.find({card: _.pluck(r.cards, 'id')}).exec(cb);
      }],
      mapCards: ['cards', function(cb, r) {
        var i, board = r.board;

        for (i=0; i<board.columns.length; i++) {
          r.cards.forEach(function(card) {
            if (card.column === board.columns[i].id) {
              var c = card.toObject(); c.votes = [];  // wtf, mate
              board.columns[i].cards.push(c);
            }
          });
        }

        cb(null, board);
      }],
      mapVotes: ['votes', 'mapCards', function(cb, r) {
        r.votes.forEach(function(vote) {
          for (var i=0; i<r.board.columns.length; i++) {
            for (var j=0; j<r.board.columns[i].cards.length; j++) {
              if (r.board.columns[i].cards[j].id === vote.card) {
                r.board.columns[i].cards[j].votes.push(vote.toObject());
              }
            }
          }
        });
        cb(null, r.board);
      }],
      final: ['mapVotes', function(cb, r) {
        r.mapVotes.columns.forEach(function(col) {
          col.cards.forEach(function(card) {
            card.locked = meta.cardLockedByWhichUsername(id, card.id);
          });
        });
        cb(null, r.mapVotes);
      }]
    }, function(err, r) {
      if (r.board === false) return _cb(null, false);
      if (err)               return _cb(err);

      _cb(null, r.final);
    });
  },

};
