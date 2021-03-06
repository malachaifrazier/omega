# Utility Methods
#
# Copyright (C) 2011-2013 Mohammed Morsi <mo@morsi.org>
# Licensed under the AGPLv3 http://www.gnu.org/licenses/agpl.txt

# TODO rename to core_ext

# XXX now 3rd place this is copied
def gen_uuid
  ["%02x"*4, "%02x"*2, "%02x"*2, "%02x"*2, "%02x"*6].join("-") %
      Array.new(16) {|x| rand(0xff) }
end

class Object
  def numeric?
    self.kind_of?(Numeric)
  end

  def numeric_string?
    self.kind_of?(String) &&
    Float(self) != nil rescue false
  end

  def attr_from_args(args, params = {})
    params.keys.each { |p|
      getter = "#{p}".intern
      setter = "#{p}=".intern
      if args.has_key?(p)
        self.send(setter, args[p])

      elsif args.has_key?(p.to_s)
        self.send(setter, args[p.to_s])

      else
        v = self.send(getter)
        self.send(setter, v || params[p])

      end
    }
    # TODO raise error if args has key not in params ? (optional?)
  end

  def update_from(old, *attrs)
    opts = attrs.last.is_a?(Hash) ? attrs.pop : {}
    opts[:skip_nil] = true unless opts.has_key?(:skip_nil)

    attrs.each { |attr|
      getter = attr.intern
      setter = "#{attr}=".intern
      v  = old.send(:[], getter) if old.respond_to?(:[])
      v  = old.send(getter)      if old.respond_to?(getter)
      self.send(setter, v)       unless opts[:skip_nil] && v.nil?
    }
  end

  def eigenclass
    class << self
      self
    end
  end
end

class Array
  def uniq_by(&blk)
    transforms = {}
    select do |el|
      t = blk[el]
      should_keep = !transforms[t]
      transforms[t] = true
      should_keep
    end
  end
end

class String
  def demodulize
    self.split('::').last
  end

  def modulize
    self.split('::')[0..-2].join('::')
  end

  # Taken from activesupport inflector
  def constantize
    names = self.split('::')
    names.shift if names.empty? || names.first.empty?

    constant = Object
    names.each do |name|
      constant = constant.const_defined?(name) ? constant.const_get(name) : constant.const_missing(name)
    end
    constant
  end
end

require 'enumerator'
class Module
  def subclasses
    ObjectSpace.to_enum(:each_object, Module).select do |m|
      m.ancestors.include?(self)
    end
  end

  def module_classes
    self.constants.collect { |c| self.const_get(c)}.
                   select  { |c| c.kind_of?(Class) }
  end

  # Define a foreign reference, this will:
  # - define the normal attribute accessor
  # - define an attribute accessor for the id attribute
  # - define attribute writer so that id attribute is set
  #     when setting attribute
  # - define id attribute writer so that attribute is set
  #     to nil if changing id
  def foreign_reference(*symbols)
    symbols.each { |symbol|
      id_symbol      = "#{symbol}_id".intern
      symbol_attr    = "@#{symbol}".intern
      id_symbol_attr = "@#{id_symbol}".intern
      writer_symbol = "#{symbol}=".intern
      id_writer_symbol = "#{id_symbol}=".intern
      attr_accessor symbol
      attr_accessor id_symbol
      define_method(writer_symbol) { |val|
        instance_variable_set symbol_attr, val
        instance_variable_set id_symbol_attr, (val.nil? ? nil : val.id)
        nil
      }
      define_method(id_writer_symbol) { |val|
        change = val != instance_variable_get(id_symbol_attr)
        instance_variable_set(id_symbol_attr, val)
        instance_variable_set(symbol_attr, nil) if change
        nil
      }
    }
    nil
  end

  # The following two were taken from ActiveSupport/CoreExtensions/Module
  def parent_name
    unless defined? @parent_name
      @parent_name = name =~ /::[^:]+\Z/ ? $`.freeze : nil
    end
    @parent_name
  end

  # See comment in parent_name above
  def parent
    parent_name ? parent_name.constantize : Object
  end
end
